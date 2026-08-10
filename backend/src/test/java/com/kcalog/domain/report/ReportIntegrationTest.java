package com.kcalog.domain.report;

import com.kcalog.IntegrationTest;
import com.kcalog.domain.auth.service.JwtService;
import com.kcalog.domain.meal.entity.Meal;
import com.kcalog.domain.meal.entity.MealItem;
import com.kcalog.domain.meal.entity.MealSource;
import com.kcalog.domain.meal.entity.MealType;
import com.kcalog.domain.meal.repository.MealRepository;
import com.kcalog.domain.member.entity.ActivityLevel;
import com.kcalog.domain.member.entity.Gender;
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
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.List;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** 기간 리포트 — 주간(요일 버킷)·달성·분포·TDEE·인사이트, 데이터 부족 */
@IntegrationTest
@Transactional
class ReportIntegrationTest {

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
        member = memberRepository.save(Member.signUp(Provider.KAKAO, "kakao-rpt", "rpt@kakao.com", "리포트"));
        member.completeOnboarding(Gender.MALE, 1996, new BigDecimal("175"),
                ActivityLevel.MID, new BigDecimal("65"), 1900);
        memberRepository.save(member);
        bearer = "Bearer " + jwtService.issueAccessToken(member.getId());
    }

    private void mealOn(LocalDate date, int kcal) {
        Meal meal = Meal.record(member.getId(), date.atTime(12, 0).atZone(KST).toInstant(),
                MealType.LUNCH, MealSource.MANUAL,
                List.of(MealItem.of("식사", kcal, new BigDecimal("50.0"), new BigDecimal("30.0"), new BigDecimal("20.0"))));
        mealRepository.save(meal);
    }

    @Test
    @DisplayName("주간 리포트 — 요일 버킷 7개·달성·분포·TDEE·인사이트")
    void weekReport() throws Exception {
        LocalDate today = LocalDate.now(KST);
        LocalDate monday = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        int loggedDays = (int) ChronoUnit.DAYS.between(monday, today) + 1;
        for (LocalDate d = monday; !d.isAfter(today); d = d.plusDays(1)) {
            mealOn(d, 2100);
        }
        weightLogRepository.upsert(member.getId(), today, new BigDecimal("70.0"));

        mockMvc.perform(get("/api/reports").param("period", "WEEK").header("Authorization", bearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.period").value("WEEK"))
                .andExpect(jsonPath("$.rangeStart").value(monday.toString()))
                .andExpect(jsonPath("$.buckets.length()").value(7)) // 월~일
                .andExpect(jsonPath("$.buckets[0].label").value("월"))
                .andExpect(jsonPath("$.daysLogged").value(loggedDays))
                .andExpect(jsonPath("$.onTargetDays").value(0)) // 2100 > 1900 감량
                .andExpect(jsonPath("$.insights.length()").value(org.hamcrest.Matchers.greaterThan(0)));
    }

    @Test
    @DisplayName("월간 리포트 — 일별 버킷")
    void monthReport() throws Exception {
        LocalDate today = LocalDate.now(KST);
        mealOn(today, 2000);

        mockMvc.perform(get("/api/reports").param("period", "MONTH").header("Authorization", bearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.period").value("MONTH"))
                .andExpect(jsonPath("$.buckets.length()").value(today.lengthOfMonth()))
                // 인사이트 문구가 '이번 주'가 아니라 기간에 맞춰 '이번 달'로 스케일됨 (🔴 회귀)
                .andExpect(jsonPath("$.insights[0].message", org.hamcrest.Matchers.containsString("이번 달")));
    }

    @Test
    @DisplayName("기록이 없으면 빈 요약·인사이트 없음")
    void emptyWeek() throws Exception {
        LocalDate futureMonday = LocalDate.now(KST).with(TemporalAdjusters.next(DayOfWeek.MONDAY)).plusWeeks(1);

        mockMvc.perform(get("/api/reports").param("period", "WEEK")
                        .param("anchor", futureMonday.toString()).header("Authorization", bearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.daysLogged").value(0))
                .andExpect(jsonPath("$.avgKcal").isEmpty())
                .andExpect(jsonPath("$.insights.length()").value(0));
    }
}
