package com.kcalog.domain.correction;

import com.kcalog.IntegrationTest;
import com.kcalog.domain.auth.service.JwtService;
import com.kcalog.domain.correction.entity.FoodCorrection;
import com.kcalog.domain.correction.entity.FoodNames;
import com.kcalog.domain.correction.repository.FoodCorrectionRepository;
import com.kcalog.domain.meal.dto.MealItemRequest;
import com.kcalog.domain.meal.dto.SaveMealRequest;
import com.kcalog.domain.meal.entity.MealSource;
import com.kcalog.domain.meal.entity.MealType;
import com.kcalog.domain.meal.repository.MealRepository;
import com.kcalog.domain.meal.service.MealService;
import com.kcalog.domain.meal.service.OpenAiClient;
import com.kcalog.domain.member.entity.Member;
import com.kcalog.domain.member.entity.Provider;
import com.kcalog.domain.member.repository.MemberRepository;
import com.kcalog.domain.analysis.entity.AnalysisStatus;
import com.kcalog.domain.analysis.repository.AnalysisJobRepository;
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
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * 학습형 수정(차별점 #1) — 정정+기억 저장(upsert·덮어쓰기)과 분석 시 코드 덮어쓰기(A).
 * 워커가 별도 트랜잭션에서 커밋된 작업을 읽으므로 @Transactional 없이 수동 정리·Awaitility. OpenAI는 목킹.
 */
@IntegrationTest
class NutritionCorrectionIntegrationTest {

    @Autowired
    MockMvc mockMvc;
    @Autowired
    MealService mealService;
    @Autowired
    MemberRepository memberRepository;
    @Autowired
    MealRepository mealRepository;
    @Autowired
    FoodCorrectionRepository correctionRepository;
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

    // AI는 김치찌개를 400kcal로 추정 — 개인 보정치(520)가 있으면 코드가 덮어써야 한다
    static final String FOUND_JSON = """
            {"foodFound":true,"items":[
              {"name":"김치찌개","kcal":400,"carbG":30.0,"proteinG":20.0,"fatG":18.0,"box":{"x":0.1,"y":0.2,"w":0.3,"h":0.3}}
            ],"overallConfidence":0.8,"notes":""}
            """;

    @BeforeEach
    void setUp() {
        member = memberRepository.save(Member.signUp(Provider.KAKAO, "kakao-corr", "corr@kakao.com", "보정"));
        bearer = "Bearer " + jwtService.issueAccessToken(member.getId());
    }

    @AfterEach
    void tearDown() {
        await().atMost(Duration.ofSeconds(5)).until(() ->
                jobRepository.findByStatus(AnalysisStatus.ANALYZING).isEmpty());
        jobRepository.deleteAll();
        correctionRepository.deleteAll();
        mealRepository.deleteAll();
        memberRepository.deleteAll();
        JdbcClient.create(dataSource).sql("DELETE FROM analysis_usage").update();
    }

    private SaveMealRequest manualSave(String name, int kcal, boolean remember) {
        return new SaveMealRequest(
                Instant.parse("2026-08-10T03:30:00Z"), MealType.LUNCH, MealSource.MANUAL,
                List.of(new MealItemRequest(name, kcal,
                        new BigDecimal("30.0"), new BigDecimal("20.0"), new BigDecimal("18.0"),
                        null, null, remember)),
                null);
    }

    @Test
    @DisplayName("정정+기억 저장 → 개인 보정치가 생성되고, 재정정하면 최신값으로 덮어써진다")
    void remembersAndOverwrites() {
        mealService.save(member.getId(), manualSave("김치찌개", 520, true));

        FoodCorrection saved = correctionRepository
                .findByMemberIdAndFoodNameNormalized(member.getId(), FoodNames.normalize("김치찌개"))
                .orElseThrow();
        assertThat(saved.getKcal()).isEqualTo(520);

        // 재정정 — 최신값 덮어쓰기(행 1개 유지)
        mealService.save(member.getId(), manualSave("김치찌개", 480, true));
        assertThat(correctionRepository.findByMemberIdOrderByUpdatedAtDesc(
                member.getId(), org.springframework.data.domain.Limit.of(10))).hasSize(1);
        assertThat(correctionRepository
                .findByMemberIdAndFoodNameNormalized(member.getId(), FoodNames.normalize("김치찌개"))
                .orElseThrow().getKcal()).isEqualTo(480);
    }

    @Test
    @DisplayName("기억하기를 켜지 않으면 개인 보정치를 저장하지 않는다")
    void doesNotRememberWithoutFlag() {
        mealService.save(member.getId(), manualSave("제육볶음", 600, false));
        assertThat(correctionRepository.findByMemberIdAndFoodNameNormalized(
                member.getId(), FoodNames.normalize("제육볶음"))).isEmpty();
    }

    @Test
    @DisplayName("보정치가 있는 회원의 분석은 해당 항목이 보정값으로 덮어써지고 corrected=true")
    void analysisOverridesWithCorrection() throws Exception {
        // 보정치 선등록(김치찌개 = 520)
        correctionRepository.save(FoodCorrection.of(member.getId(), "김치찌개", 520,
                new BigDecimal("15.0"), new BigDecimal("32.0"), new BigDecimal("30.0")));
        when(openAiClient.complete(any())).thenReturn(FOUND_JSON);

        MockMultipartFile image = new MockMultipartFile("image", "food.jpg", "image/jpeg", "bytes".getBytes());
        String body = mockMvc.perform(multipart("/api/analyses").file(image).header("Authorization", bearer))
                .andExpect(status().isAccepted())
                .andReturn().getResponse().getContentAsString();
        Long jobId = com.jayway.jsonpath.JsonPath.parse(body).read("$.id", Long.class);

        await().atMost(Duration.ofSeconds(5)).until(() ->
                jobRepository.findById(jobId).orElseThrow().getStatus() == AnalysisStatus.COMPLETED);

        mockMvc.perform(get("/api/analyses/{id}", jobId).header("Authorization", bearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result.items[0].kcal").value(520))       // AI 400 → 보정 520
                .andExpect(jsonPath("$.result.items[0].corrected").value(true));
    }
}
