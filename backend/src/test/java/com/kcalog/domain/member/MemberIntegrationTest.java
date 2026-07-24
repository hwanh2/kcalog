package com.kcalog.domain.member;

import com.kcalog.IntegrationTest;
import com.kcalog.domain.auth.service.JwtService;
import com.kcalog.domain.member.entity.Member;
import com.kcalog.domain.member.entity.Provider;
import com.kcalog.domain.member.repository.MemberRepository;
import com.kcalog.domain.weight.repository.WeightLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@IntegrationTest
@Transactional
class MemberIntegrationTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    MemberRepository memberRepository;

    @Autowired
    WeightLogRepository weightLogRepository;

    @Autowired
    JwtService jwtService;

    Member member;
    String bearer;

    static final String VALID_ONBOARDING = """
            {
              "gender": "MALE",
              "birthYear": 1990,
              "heightCm": 175,
              "weightKg": 70,
              "targetWeightKg": 65,
              "activityLevel": "MID",
              "dailyKcalTarget": 1930
            }
            """;

    @BeforeEach
    void setUp() {
        member = memberRepository.save(Member.signUp(Provider.KAKAO, "kakao-onboarding", "user@kakao.com", "테스터"));
        bearer = "Bearer " + jwtService.issueAccessToken(member.getId());
    }

    @Test
    @DisplayName("온보딩 전 /me — onboardingCompleted=false, 프로필 필드 null")
    void meBeforeOnboarding() throws Exception {
        mockMvc.perform(get("/api/members/me").header("Authorization", bearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nickname").value("테스터"))
                .andExpect(jsonPath("$.onboardingCompleted").value(false))
                .andExpect(jsonPath("$.dailyKcalTarget").isEmpty())
                .andExpect(jsonPath("$.latestWeightKg").isEmpty());
    }

    @Test
    @DisplayName("온보딩 정상 제출 — 프로필 저장 + 오늘 weight_log 생성 + 완료 판정")
    void onboarding() throws Exception {
        mockMvc.perform(post("/api/members/me/onboarding").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON).content(VALID_ONBOARDING))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.onboardingCompleted").value(true))
                .andExpect(jsonPath("$.dailyKcalTarget").value(1930))
                .andExpect(jsonPath("$.latestWeightKg").value(70));

        assertThat(weightLogRepository.findTopByMemberIdOrderByLogDateDesc(member.getId()))
                .hasValueSatisfying(log -> assertThat(log.getWeightKg()).isEqualByComparingTo("70"));

        mockMvc.perform(get("/api/members/me").header("Authorization", bearer))
                .andExpect(jsonPath("$.onboardingCompleted").value(true))
                .andExpect(jsonPath("$.gender").value("MALE"));
    }

    @Test
    @DisplayName("온보딩 재제출 — 같은 날 체중은 upsert되어 weight_log가 1행 유지")
    void onboardingUpsertsSameDayWeight() throws Exception {
        mockMvc.perform(post("/api/members/me/onboarding").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON).content(VALID_ONBOARDING))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/members/me/onboarding").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_ONBOARDING.replace("\"weightKg\": 70", "\"weightKg\": 69.5")))
                .andExpect(status().isOk());

        assertThat(weightLogRepository.findAll().stream()
                .filter(log -> log.getMemberId().equals(member.getId()))).hasSize(1);
        assertThat(weightLogRepository.findTopByMemberIdOrderByLogDateDesc(member.getId()))
                .hasValueSatisfying(log -> assertThat(log.getWeightKg()).isEqualByComparingTo("69.5"));
    }

    @Test
    @DisplayName("유효 범위 밖 입력 — 400 + 항목별 오류, 아무것도 저장되지 않음")
    void onboardingValidation() throws Exception {
        String invalid = VALID_ONBOARDING
                .replace("\"heightCm\": 175", "\"heightCm\": 90")
                .replace("\"weightKg\": 70", "\"weightKg\": 20");

        mockMvc.perform(post("/api/members/me/onboarding").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON).content(invalid))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors.heightCm").exists())
                .andExpect(jsonPath("$.errors.weightKg").exists());

        assertThat(memberRepository.findById(member.getId()).orElseThrow().isOnboardingCompleted()).isFalse();
        assertThat(weightLogRepository.findTopByMemberIdOrderByLogDateDesc(member.getId())).isEmpty();
    }

    @Test
    @DisplayName("미래 출생연도 — 400")
    void onboardingFutureBirthYear() throws Exception {
        mockMvc.perform(post("/api/members/me/onboarding").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_ONBOARDING.replace("\"birthYear\": 1990", "\"birthYear\": 3000")))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("제안 칼로리 조회 — 계산기 결과와 일치 (배선 검증)")
    void kcalSuggestion() throws Exception {
        mockMvc.perform(get("/api/members/me/kcal-suggestion").header("Authorization", bearer)
                        .param("gender", "MALE").param("birthYear", "1990")
                        .param("heightCm", "175").param("weightKg", "70")
                        .param("targetWeightKg", "65").param("activityLevel", "MID"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dailyKcalTarget").isNumber());
    }

    @Test
    @DisplayName("프로필 부분 수정 — 보낸 필드만 반영, 나머지 유지")
    void updateProfile() throws Exception {
        mockMvc.perform(post("/api/members/me/onboarding").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON).content(VALID_ONBOARDING))
                .andExpect(status().isOk());

        mockMvc.perform(patch("/api/members/me").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"activityLevel\": \"HIGH\", \"dailyKcalTarget\": 2200}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activityLevel").value("HIGH"))
                .andExpect(jsonPath("$.dailyKcalTarget").value(2200))
                .andExpect(jsonPath("$.heightCm").value(175))
                .andExpect(jsonPath("$.targetWeightKg").value(65));
    }

    @Test
    @DisplayName("프로필 수정 검증 — 범위 밖 값이면 400, 기존 값 유지")
    void updateProfileValidation() throws Exception {
        mockMvc.perform(post("/api/members/me/onboarding").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON).content(VALID_ONBOARDING))
                .andExpect(status().isOk());

        mockMvc.perform(patch("/api/members/me").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"dailyKcalTarget\": 100}"))
                .andExpect(status().isBadRequest());

        assertThat(memberRepository.findById(member.getId()).orElseThrow().getDailyKcalTarget()).isEqualTo(1930);
    }
}
