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
import java.time.Clock;
import java.time.Year;

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

    /** "올해"의 단일 출처 — 서비스와 같은 KST Clock을 써야 연말 자정 경계에서 테스트가 흔들리지 않는다 */
    @Autowired
    Clock clock;

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
              "goal": "CUT",
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
    @DisplayName("제안 칼로리 조회 — 미래 출생연도면 400 (나이 음수 → 계산 왜곡 차단)")
    void kcalSuggestionFutureBirthYear() throws Exception {
        mockMvc.perform(get("/api/members/me/kcal-suggestion").header("Authorization", bearer)
                        .param("gender", "MALE").param("birthYear", "3000")
                        .param("heightCm", "175").param("weightKg", "70")
                        .param("activityLevel", "MID").param("goal", "CUT"))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("제안 칼로리 조회 — 목표 체중 없이 방향만으로 계산, 유지칼로리·탄단지 근거 포함")
    void kcalSuggestion() throws Exception {
        // BMR = 1618.75(1990년생 기준 나이에 따라 변동), TDEE(MID) = BMR×1.5, CUT이면 −500
        mockMvc.perform(get("/api/members/me/kcal-suggestion").header("Authorization", bearer)
                        .param("gender", "MALE").param("birthYear", "1990")
                        .param("heightCm", "175").param("weightKg", "70")
                        .param("activityLevel", "MID").param("goal", "CUT"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.maintenanceKcal").isNumber())
                .andExpect(jsonPath("$.dailyKcalTarget").isNumber())
                .andExpect(jsonPath("$.carbTargetG").isNumber())
                .andExpect(jsonPath("$.proteinTargetG").isNumber())
                .andExpect(jsonPath("$.fatTargetG").isNumber());
    }

    @Test
    @DisplayName("온보딩 — 목표 체중 없이도 방향만으로 완료된다")
    void onboardingWithoutTargetWeight() throws Exception {
        String body = """
                {
                  "gender": "MALE",
                  "birthYear": 1990,
                  "heightCm": 175,
                  "weightKg": 70,
                  "activityLevel": "MID",
                  "goal": "MAINTAIN",
                  "dailyKcalTarget": 2430
                }
                """;

        mockMvc.perform(post("/api/members/me/onboarding").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.onboardingCompleted").value(true))
                .andExpect(jsonPath("$.goal").value("MAINTAIN"))
                .andExpect(jsonPath("$.targetWeightKg").isEmpty())
                .andExpect(jsonPath("$.dailyKcalTarget").value(2430));
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

    @Test
    @DisplayName("출생연도·성별 수정 — 유지칼로리 공식에 들어가는 값이라 고칠 수 있어야 한다")
    void updateBirthYearAndGender() throws Exception {
        mockMvc.perform(post("/api/members/me/onboarding").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON).content(VALID_ONBOARDING))
                .andExpect(status().isOk());

        mockMvc.perform(patch("/api/members/me").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"birthYear\": 1994, \"gender\": \"FEMALE\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.birthYear").value(1994))
                .andExpect(jsonPath("$.gender").value("FEMALE"))
                // 함께 보내지 않은 값은 그대로 — 부분 수정 규칙
                .andExpect(jsonPath("$.heightCm").value(175))
                .andExpect(jsonPath("$.dailyKcalTarget").value(1930));
    }

    @Test
    @DisplayName("미래 출생연도는 400 — 온보딩에 걸린 검증이 수정 경로에도 걸린다")
    void updateFutureBirthYear() throws Exception {
        mockMvc.perform(post("/api/members/me/onboarding").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON).content(VALID_ONBOARDING))
                .andExpect(status().isOk());

        int nextYear = Year.now(clock).getValue() + 1;
        mockMvc.perform(patch("/api/members/me").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"birthYear\": %d}".formatted(nextYear)))
                .andExpect(status().isBadRequest());

        assertThat(memberRepository.findById(member.getId()).orElseThrow().getBirthYear()).isEqualTo(1990);
    }

    @Test
    @DisplayName("1920년 이전 출생연도는 400")
    void updateTooOldBirthYear() throws Exception {
        mockMvc.perform(post("/api/members/me/onboarding").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON).content(VALID_ONBOARDING))
                .andExpect(status().isOk());

        mockMvc.perform(patch("/api/members/me").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"birthYear\": 1919}"))
                .andExpect(status().isBadRequest());

        assertThat(memberRepository.findById(member.getId()).orElseThrow().getBirthYear()).isEqualTo(1990);
    }
}
