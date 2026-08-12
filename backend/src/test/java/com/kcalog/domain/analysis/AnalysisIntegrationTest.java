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

import static org.assertj.core.api.Assertions.assertThat;
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
              {"name":"김치찌개","kcal":400,"amount":1,"unit":"인분","carbG":30.0,"proteinG":20.0,"fatG":18.0,
               "box":{"x":0.1,"y":0.2,"w":0.3,"h":0.3}}
            ],"overallConfidence":0.8,"notes":""}
            """;

    /** 사진 없는 분석 결과 — 위치 박스가 없다 */
    static final String TEXT_FOUND_JSON = """
            {"foodFound":true,"items":[
              {"name":"김밥","kcal":480,"amount":1,"unit":"줄","carbG":75.0,"proteinG":14.0,"fatG":12.0}
            ],"overallConfidence":0.6,"notes":""}
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

    // --- 입력 조합: 사진 / 사진+설명 / 설명만 -------------------------------

    @Test
    @DisplayName("사진 + 설명 — 설명이 작업에 저장되고 분석에 반영된다")
    void photoWithNote() throws Exception {
        when(openAiClient.complete(any())).thenReturn(FOUND_JSON);

        String body = mockMvc.perform(multipart("/api/analyses").file(image())
                        .param("note", "드레싱은 절반만 뿌렸어요")
                        .header("Authorization", bearer))
                .andExpect(status().isAccepted())
                .andReturn().getResponse().getContentAsString();
        Long id = com.jayway.jsonpath.JsonPath.parse(body).read("$.id", Long.class);
        awaitStatus(id, "COMPLETED");

        assertThat(jobRepository.findById(id).orElseThrow().getNote()).isEqualTo("드레싱은 절반만 뿌렸어요");
    }

    @Test
    @DisplayName("설명만 — 사진 없이 작업이 만들어지고 위치 박스 없는 항목이 나온다")
    void noteOnly() throws Exception {
        when(openAiClient.complete(any())).thenReturn(TEXT_FOUND_JSON);

        String body = mockMvc.perform(multipart("/api/analyses")
                        .param("note", "김밥 한 줄이랑 라면 반 개")
                        .header("Authorization", bearer))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.imageUrl").doesNotExist())
                .andReturn().getResponse().getContentAsString();
        Long id = com.jayway.jsonpath.JsonPath.parse(body).read("$.id", Long.class);
        awaitStatus(id, "COMPLETED");

        mockMvc.perform(get("/api/analyses/" + id).header("Authorization", bearer))
                .andExpect(jsonPath("$.imageUrl").doesNotExist())
                .andExpect(jsonPath("$.result.items[0].name").value("김밥"))
                .andExpect(jsonPath("$.result.items[0].amount").value(1))
                .andExpect(jsonPath("$.result.items[0].unit").value("줄"))
                .andExpect(jsonPath("$.result.items[0].box").doesNotExist());
    }

    @Test
    @DisplayName("사진도 설명도 없으면 400")
    void requiresPhotoOrNote() throws Exception {
        mockMvc.perform(multipart("/api/analyses").header("Authorization", bearer))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("공백뿐인 설명은 입력으로 치지 않는다 — 400")
    void blankNoteRejected() throws Exception {
        mockMvc.perform(multipart("/api/analyses").param("note", "   ").header("Authorization", bearer))
                .andExpect(status().isBadRequest());
    }

    // --- 재분석 ------------------------------------------------------------

    private void reanalyze(Long id, String note, int expectedStatus) throws Exception {
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .post("/api/analyses/" + id + "/reanalyze")
                        .header("Authorization", bearer)
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content("{\"note\": \"" + note + "\"}"))
                .andExpect(status().is(expectedStatus));
    }

    @Test
    @DisplayName("재분석 — 같은 작업이 새 결과로 대체되고 사진은 유지된다")
    void reanalyzeReplacesResult() throws Exception {
        when(openAiClient.complete(any())).thenReturn(FOUND_JSON);
        Long id = createJob();
        awaitStatus(id, "COMPLETED");
        String imageKey = jobRepository.findById(id).orElseThrow().getImageKey();

        when(openAiClient.complete(any())).thenReturn(FOUND_JSON.replace("김치찌개", "된장찌개"));
        reanalyze(id, "된장찌개였어요", 202);
        await().atMost(Duration.ofSeconds(5)).untilAsserted(() ->
                mockMvc.perform(get("/api/analyses/" + id).header("Authorization", bearer))
                        .andExpect(jsonPath("$.result.items[0].name").value("된장찌개")));

        assertThat(jobRepository.findById(id).orElseThrow().getImageKey()).isEqualTo(imageKey);
    }

    @Test
    @DisplayName("재분석 3회째 — 작업당 2회를 넘으면 400")
    void reanalyzeLimit() throws Exception {
        when(openAiClient.complete(any())).thenReturn(FOUND_JSON);
        Long id = createJob();
        awaitStatus(id, "COMPLETED");

        reanalyze(id, "한 번", 202);
        awaitStatus(id, "COMPLETED");
        reanalyze(id, "두 번", 202);
        awaitStatus(id, "COMPLETED");
        reanalyze(id, "세 번", 400);
    }

    @Test
    @DisplayName("재분석도 일일 횟수를 차감한다 — 상한을 채운 뒤에는 429")
    void reanalyzeCountsToDailyLimit() throws Exception {
        when(openAiClient.complete(any())).thenReturn(FOUND_JSON);
        Long id = createJob();
        awaitStatus(id, "COMPLETED");

        for (int i = 0; i < 19; i++) { // 생성 1 + 19 = 상한 20 소진
            mockMvc.perform(multipart("/api/analyses").file(image()).header("Authorization", bearer))
                    .andExpect(status().isAccepted());
        }
        reanalyze(id, "설명 추가", 429);
    }

    @Test
    @DisplayName("설명만으로 만든 작업도 재분석할 수 있다")
    void reanalyzeTextOnlyJob() throws Exception {
        when(openAiClient.complete(any())).thenReturn(TEXT_FOUND_JSON);
        String body = mockMvc.perform(multipart("/api/analyses").param("note", "김밥 한 줄")
                        .header("Authorization", bearer))
                .andExpect(status().isAccepted())
                .andReturn().getResponse().getContentAsString();
        Long id = com.jayway.jsonpath.JsonPath.parse(body).read("$.id", Long.class);
        awaitStatus(id, "COMPLETED");

        when(openAiClient.complete(any())).thenReturn(TEXT_FOUND_JSON.replace("김밥", "참치김밥"));
        reanalyze(id, "참치김밥이었어요", 202);
        await().atMost(Duration.ofSeconds(5)).untilAsserted(() ->
                mockMvc.perform(get("/api/analyses/" + id).header("Authorization", bearer))
                        .andExpect(jsonPath("$.result.items[0].name").value("참치김밥")));
    }

    @Test
    @DisplayName("타인 작업 재분석 — 404")
    void reanalyzeOtherBlocked() throws Exception {
        when(openAiClient.complete(any())).thenReturn(FOUND_JSON);
        Long id = createJob();
        awaitStatus(id, "COMPLETED");

        Member other = memberRepository.save(Member.signUp(Provider.KAKAO, "kakao-y", "y@kakao.com", "타인2"));
        String otherBearer = "Bearer " + jwtService.issueAccessToken(other.getId());

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .post("/api/analyses/" + id + "/reanalyze")
                        .header("Authorization", otherBearer)
                        .contentType(org.springframework.http.MediaType.APPLICATION_JSON)
                        .content("{\"note\": \"남의 작업\"}"))
                .andExpect(status().isNotFound());
    }
}
