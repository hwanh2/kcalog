package com.kcalog.domain.analysis;

import com.kcalog.IntegrationTest;
import com.kcalog.domain.analysis.repository.AnalysisJobRepository;
import com.kcalog.domain.auth.service.JwtService;
import com.kcalog.domain.meal.repository.MealRepository;
import com.kcalog.domain.meal.service.OpenAiClient;
import com.kcalog.domain.member.entity.Member;
import com.kcalog.domain.member.entity.Provider;
import com.kcalog.domain.member.repository.MemberRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import javax.sql.DataSource;
import java.time.Duration;

import static org.awaitility.Awaitility.await;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 비동기 분석 — 작업 생성 → 폴링(완료/미검출/실패) → 소유권·인증·일일 제한.
 * 워커가 별도 트랜잭션에서 커밋된 작업을 읽으므로 @Transactional을 쓰지 않고 수동 정리한다. OpenAI는 목킹.
 */
@IntegrationTest
class AnalysisIntegrationTest {

    @Autowired
    MockMvc mockMvc;
    @Autowired
    MemberRepository memberRepository;
    @Autowired
    MealRepository mealRepository;
    @Autowired
    AnalysisJobRepository jobRepository;
    @Autowired
    JwtService jwtService;
    @Autowired
    DataSource dataSource;

    @MockitoBean
    OpenAiClient openAiClient;

    Member member;
    String bearer;

    static final String FOUND_JSON = """
            {"foodFound":true,"items":[
              {"name":"김치찌개","kcal":400,"carbG":30.0,"proteinG":20.0,"fatG":18.0,"box":{"x":0.1,"y":0.2,"w":0.3,"h":0.3}}
            ],"overallConfidence":0.8,"notes":""}
            """;

    @BeforeEach
    void setUp() {
        member = memberRepository.save(Member.signUp(Provider.KAKAO, "kakao-async", "async@kakao.com", "비동기"));
        bearer = "Bearer " + jwtService.issueAccessToken(member.getId());
    }

    @AfterEach
    void tearDown() {
        // 백그라운드 워커가 끝난 뒤 정리 (미완료 작업이 삭제된 행을 건드리지 않도록)
        await().atMost(Duration.ofSeconds(5)).until(() ->
                jobRepository.findByStatus(com.kcalog.domain.analysis.entity.AnalysisStatus.ANALYZING).isEmpty());
        jobRepository.deleteAll();
        mealRepository.deleteAll();
        memberRepository.deleteAll();
        JdbcClient.create(dataSource).sql("DELETE FROM analysis_usage").update();
    }

    private MockMultipartFile image() {
        return new MockMultipartFile("image", "food.jpg", "image/jpeg", "fake-bytes".getBytes());
    }

    private Long createJob() throws Exception {
        String body = mockMvc.perform(multipart("/api/analyses").file(image()).header("Authorization", bearer))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.id").exists())
                .andReturn().getResponse().getContentAsString();
        return com.jayway.jsonpath.JsonPath.parse(body).read("$.id", Long.class);
    }

    private void awaitStatus(Long id, String expected) {
        await().atMost(Duration.ofSeconds(5)).untilAsserted(() ->
                mockMvc.perform(get("/api/analyses/" + id).header("Authorization", bearer))
                        .andExpect(jsonPath("$.status").value(expected)));
    }

    @Test
    @DisplayName("작업 생성 → 폴링 완료 — 음식별 항목·사진 URL 반환")
    void createAndComplete() throws Exception {
        when(openAiClient.complete(any())).thenReturn(FOUND_JSON);

        Long id = createJob();
        awaitStatus(id, "COMPLETED");

        mockMvc.perform(get("/api/analyses/" + id).header("Authorization", bearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.items[0].name").value("김치찌개"))
                .andExpect(jsonPath("$.imageUrl").value(org.hamcrest.Matchers.startsWith("/api/photos/" + member.getId() + "/")));
    }

    @Test
    @DisplayName("음식 미검출 → NO_FOOD")
    void noFood() throws Exception {
        when(openAiClient.complete(any())).thenReturn("""
                {"foodFound":false,"items":[],"overallConfidence":0.0,"notes":"음식을 찾지 못했어요"}
                """);

        Long id = createJob();
        awaitStatus(id, "NO_FOOD");
    }

    @Test
    @DisplayName("분석 오류(재시도 후) → FAILED")
    void failed() throws Exception {
        when(openAiClient.complete(any())).thenThrow(new RuntimeException("openai down"));

        Long id = createJob();
        awaitStatus(id, "FAILED");

        mockMvc.perform(get("/api/analyses/" + id).header("Authorization", bearer))
                .andExpect(jsonPath("$.errorCode").value("ANALYSIS_ERROR"));
    }

    @Test
    @DisplayName("타인 작업 조회 — 404")
    void otherBlocked() throws Exception {
        when(openAiClient.complete(any())).thenReturn(FOUND_JSON);
        Long id = createJob();

        Member other = memberRepository.save(Member.signUp(Provider.KAKAO, "kakao-x", "x@kakao.com", "타인"));
        String otherBearer = "Bearer " + jwtService.issueAccessToken(other.getId());

        mockMvc.perform(get("/api/analyses/" + id).header("Authorization", otherBearer))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("일일 상한 초과 — 21번째 생성은 429")
    void dailyLimit() throws Exception {
        when(openAiClient.complete(any())).thenReturn(FOUND_JSON);

        for (int i = 0; i < 20; i++) {
            mockMvc.perform(multipart("/api/analyses").file(image()).header("Authorization", bearer))
                    .andExpect(status().isAccepted());
        }
        mockMvc.perform(multipart("/api/analyses").file(image()).header("Authorization", bearer))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    @DisplayName("인증 없는 요청 — 401")
    void requiresAuth() throws Exception {
        mockMvc.perform(multipart("/api/analyses").file(image()))
                .andExpect(status().isUnauthorized());
    }
}
