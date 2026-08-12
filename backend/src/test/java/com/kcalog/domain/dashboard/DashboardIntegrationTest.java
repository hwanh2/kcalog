package com.kcalog.domain.dashboard;

import com.kcalog.IntegrationTest;
import com.kcalog.domain.auth.service.JwtService;
import com.kcalog.domain.meal.entity.Meal;
import com.kcalog.domain.meal.entity.MealItem;
import com.kcalog.domain.meal.entity.MealSource;
import com.kcalog.domain.meal.entity.MealType;
import com.kcalog.domain.meal.repository.MealRepository;
import com.kcalog.domain.member.entity.ActivityLevel;
import com.kcalog.domain.member.entity.Gender;
import com.kcalog.domain.member.entity.Goal;
import com.kcalog.domain.member.entity.Member;
import com.kcalog.domain.member.entity.Provider;
import com.kcalog.domain.member.repository.MemberRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** 대시보드 집계 — 합계·목표 대비 잔여·타임라인. clock은 Asia/Seoul이라 KST 하루 경계로 조회 */
@IntegrationTest
@Transactional
class DashboardIntegrationTest {

    @Autowired
    MockMvc mockMvc;
    @Autowired
    MemberRepository memberRepository;
    @Autowired
    MealRepository mealRepository;
    @Autowired
    JwtService jwtService;

    Member member;
    String bearer;

    // 2026-08-08의 서비스 하루(05:00 경계) = [2026-08-07T20:00Z, 2026-08-08T20:00Z)
    static final String DATE = "2026-08-08";
    static final Instant LUNCH_AT = Instant.parse("2026-08-08T03:00:00Z");   // 12:00 KST
    static final Instant BREAKFAST_AT = Instant.parse("2026-08-08T00:00:00Z"); // 09:00 KST

    @BeforeEach
    void setUp() {
        member = memberRepository.save(Member.signUp(Provider.KAKAO, "kakao-dash", "d@kakao.com", "대시"));
        member.completeOnboarding(Gender.MALE, 1995, new BigDecimal("175.0"), ActivityLevel.MID,
                Goal.MAINTAIN, new BigDecimal("70.0"), 2000);
        memberRepository.save(member);
        bearer = "Bearer " + jwtService.issueAccessToken(member.getId());
    }

    private Meal meal(Instant eatenAt, MealType type, int kcal, String carb, String protein, String fat) {
        return Meal.record(member.getId(), eatenAt, type, MealSource.AI,
                List.of(MealItem.of("음식", kcal, new BigDecimal(carb), new BigDecimal(protein), new BigDecimal(fat))));
    }

    @Test
    @DisplayName("하루 요약 — 합계·잔여·타임라인(시각순) 반환")
    void summary() throws Exception {
        // 저장 순서를 시간 역순으로 넣어 타임라인 정렬을 검증
        mealRepository.save(meal(LUNCH_AT, MealType.LUNCH, 650, "75.0", "30.0", "22.0"));
        mealRepository.save(meal(BREAKFAST_AT, MealType.BREAKFAST, 350, "40.0", "15.0", "10.0"));

        mockMvc.perform(get("/api/dashboard").param("date", DATE).header("Authorization", bearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalKcal").value(1000))
                .andExpect(jsonPath("$.carbG").value(115.0))
                .andExpect(jsonPath("$.dailyKcalTarget").value(2000))
                .andExpect(jsonPath("$.remainingKcal").value(1000))
                // 탄단지 목표 = 2000kcal의 50/30/20 → 탄 250 / 단 150 / 지 44 (design D3)
                .andExpect(jsonPath("$.carbTargetG").value(250))
                .andExpect(jsonPath("$.proteinTargetG").value(150))
                .andExpect(jsonPath("$.fatTargetG").value(44))
                .andExpect(jsonPath("$.timeline.length()").value(2))
                .andExpect(jsonPath("$.timeline[0].mealType").value("BREAKFAST")) // 시각 오름차순
                .andExpect(jsonPath("$.timeline[1].mealType").value("LUNCH"))
                .andExpect(jsonPath("$.timeline[0].totalKcal").value(350));
    }

    @Test
    @DisplayName("기록 없는 날 — 모든 합계 0, 잔여 = 목표")
    void emptyDay() throws Exception {
        mockMvc.perform(get("/api/dashboard").param("date", DATE).header("Authorization", bearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalKcal").value(0))
                .andExpect(jsonPath("$.carbG").value(0))
                .andExpect(jsonPath("$.remainingKcal").value(2000))
                .andExpect(jsonPath("$.timeline.length()").value(0));
    }

    @Test
    @DisplayName("목표 초과 — 잔여가 음수")
    void overTarget() throws Exception {
        mealRepository.save(meal(LUNCH_AT, MealType.LUNCH, 1500, "100.0", "50.0", "40.0"));
        mealRepository.save(meal(BREAKFAST_AT, MealType.BREAKFAST, 900, "80.0", "30.0", "20.0"));

        mockMvc.perform(get("/api/dashboard").param("date", DATE).header("Authorization", bearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalKcal").value(2400))
                .andExpect(jsonPath("$.remainingKcal").value(-400)); // 2000 - 2400
    }

    @Test
    @DisplayName("다른 날 식사는 집계에서 제외 — 05:00 하루 경계")
    void otherDayExcluded() throws Exception {
        mealRepository.save(meal(LUNCH_AT, MealType.LUNCH, 650, "75.0", "30.0", "22.0"));
        // 2026-08-08T20:00Z = 2026-08-09 05:00 KST → 다음날, 제외돼야 함
        mealRepository.save(meal(Instant.parse("2026-08-08T20:00:00Z"), MealType.DINNER, 800, "90.0", "40.0", "25.0"));

        mockMvc.perform(get("/api/dashboard").param("date", DATE).header("Authorization", bearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalKcal").value(650))
                .andExpect(jsonPath("$.timeline.length()").value(1));
    }

    @Test
    @DisplayName("새벽 야식은 전날 집계에 포함된다 — 05:00 이전")
    void lateNightCountsToPreviousDay() throws Exception {
        mealRepository.save(meal(LUNCH_AT, MealType.LUNCH, 650, "75.0", "30.0", "22.0"));
        // 2026-08-08T19:30Z = 2026-08-09 04:30 KST → 서비스 하루로는 아직 8/8
        mealRepository.save(meal(Instant.parse("2026-08-08T19:30:00Z"), MealType.LATE_NIGHT,
                350, "40.0", "10.0", "15.0"));

        mockMvc.perform(get("/api/dashboard").param("date", DATE).header("Authorization", bearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalKcal").value(1000))
                .andExpect(jsonPath("$.timeline.length()").value(2));
    }

    @Test
    @DisplayName("목표 미설정 회원 — 잔여·탄단지 목표가 모두 null")
    void noTargetMember() throws Exception {
        // 온보딩 전(dailyKcalTarget=null) 회원
        Member fresh = memberRepository.save(Member.signUp(Provider.KAKAO, "kakao-fresh", "f@kakao.com", "신규"));
        String freshBearer = "Bearer " + jwtService.issueAccessToken(fresh.getId());

        mockMvc.perform(get("/api/dashboard").param("date", DATE).header("Authorization", freshBearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dailyKcalTarget").doesNotExist())
                .andExpect(jsonPath("$.remainingKcal").doesNotExist())
                .andExpect(jsonPath("$.carbTargetG").doesNotExist())
                .andExpect(jsonPath("$.proteinTargetG").doesNotExist())
                .andExpect(jsonPath("$.fatTargetG").doesNotExist());
    }

    @Test
    @DisplayName("인증 없는 요청 — 401")
    void requiresAuth() throws Exception {
        mockMvc.perform(get("/api/dashboard").param("date", DATE))
                .andExpect(status().isUnauthorized());
    }
}
