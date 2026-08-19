package com.kcalog.domain.tdee;

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
import com.kcalog.domain.weight.repository.WeightLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** 적응형 유지칼로리 — 실측(OK)·불완전 로깅 폴백(INSUFFICIENT) */
@IntegrationTest
@Transactional
class TdeeIntegrationTest {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    @Autowired
    MockMvc mockMvc;
    @Autowired
    MemberRepository memberRepository;
    @Autowired
    MealRepository mealRepository;
    @Autowired
    WeightLogRepository weightLogRepository;
    @Autowired
    JwtService jwtService;

    Member member;
    String bearer;

    @BeforeEach
    void setUp() {
        member = memberRepository.save(Member.signUp(Provider.KAKAO, "kakao-tdee", "tdee@kakao.com", "티디이"));
        member.completeOnboarding(Gender.MALE, 1996, new BigDecimal("175"),
                ActivityLevel.MID, Goal.CUT, new BigDecimal("65"), 1900, false);
        memberRepository.save(member);
        bearer = "Bearer " + jwtService.issueAccessToken(member.getId());
    }

    private void mealOn(LocalDate date, int kcal) {
        mealOn(member.getId(), date, kcal);
    }

    private void mealOn(Long memberId, LocalDate date, int kcal) {
        Meal meal = Meal.record(memberId, date.atTime(12, 0).atZone(KST).toInstant(),
                MealType.LUNCH, MealSource.MANUAL,
                List.of(MealItem.of("식사", kcal, new BigDecimal("50.0"), new BigDecimal("30.0"), new BigDecimal("20.0"))));
        mealRepository.save(meal);
    }

    @Test
    @DisplayName("14일 섭취·감소 추세 → 실측 유지칼로리(OK, ADAPTIVE)와 추천 목표")
    void adaptiveOk() throws Exception {
        LocalDate today = LocalDate.now(KST);
        for (int i = 0; i < 14; i++) {
            LocalDate d = today.minusDays(13 - i);
            mealOn(d, 2000);
            weightLogRepository.upsert(member.getId(), d, BigDecimal.valueOf(70.0 - 0.05 * i)); // 감소 추세
        }

        mockMvc.perform(get("/api/tdee").header("Authorization", bearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("OK"))
                .andExpect(jsonPath("$.source").value("ADAPTIVE"))
                .andExpect(jsonPath("$.maintenanceKcal").value(org.hamcrest.Matchers.greaterThan(2000))) // 감량 중이라 섭취>=?
                .andExpect(jsonPath("$.currentTargetKcal").value(1900))
                .andExpect(jsonPath("$.recommendedTargetKcal").exists());
    }

    @Test
    @DisplayName("섭취 로깅이 성기면 실측 대신 공식 TDEE로 폴백(INSUFFICIENT, FORMULA)")
    void insufficientFallback() throws Exception {
        LocalDate today = LocalDate.now(KST);
        for (int i = 0; i < 14; i++) {
            weightLogRepository.upsert(member.getId(), today.minusDays(13 - i), BigDecimal.valueOf(70.0 - 0.05 * i));
        }
        // 섭취는 3일만 (커버리지 3/14 < 0.8)
        mealOn(today, 2000);
        mealOn(today.minusDays(5), 2000);
        mealOn(today.minusDays(10), 2000);

        mockMvc.perform(get("/api/tdee").header("Authorization", bearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("INSUFFICIENT_DATA"))
                .andExpect(jsonPath("$.source").value("FORMULA"))
                .andExpect(jsonPath("$.maintenanceKcal").exists()) // 공식 유지칼로리
                .andExpect(jsonPath("$.recommendedTargetKcal").exists());
    }

    @Test
    @DisplayName("프로필이 없어도 섭취·체중 추세가 충분하면 적응형 실측이 나온다(추천 목표는 생략)")
    void adaptiveWithoutProfile() throws Exception {
        Member bare = memberRepository.save(Member.signUp(Provider.KAKAO, "kakao-bare", "bare@kakao.com", "노프로필"));
        String bareBearer = "Bearer " + jwtService.issueAccessToken(bare.getId());
        LocalDate today = LocalDate.now(KST);
        for (int i = 0; i < 14; i++) {
            LocalDate d = today.minusDays(13 - i);
            mealOn(bare.getId(), d, 2000);
            weightLogRepository.upsert(bare.getId(), d, BigDecimal.valueOf(70.0 - 0.05 * i));
        }

        mockMvc.perform(get("/api/tdee").header("Authorization", bareBearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("OK"))
                .andExpect(jsonPath("$.source").value("ADAPTIVE"))
                .andExpect(jsonPath("$.maintenanceKcal").value(org.hamcrest.Matchers.greaterThan(2000)))
                .andExpect(jsonPath("$.recommendedTargetKcal").isEmpty()); // 목표체중·성별 없음
    }

    @Test
    @DisplayName("체중 기록이 없으면 데이터 부족")
    void noWeight() throws Exception {
        mockMvc.perform(get("/api/tdee").header("Authorization", bearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("INSUFFICIENT_DATA"))
                .andExpect(jsonPath("$.maintenanceKcal").isEmpty());
    }
}
