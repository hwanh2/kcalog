package com.kcalog.domain.member.service;

import com.kcalog.domain.member.entity.ActivityLevel;
import com.kcalog.domain.member.entity.Gender;
import com.kcalog.domain.member.entity.Goal;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Year;

/**
 * 일일 칼로리 목표 제안 (design D3).
 * Mifflin-St Jeor BMR × 활동계수 + 목표 방향 조정(감량 −500 / 증량 +300 / 유지 0),
 * 하한선(남 1500 / 여 1200) 클램프, 10 단위 반올림. 결과는 제안값이며 최종 확정은 사용자 몫.
 */
@Service
public class DailyKcalCalculator {

    private static final int MALE_FLOOR = 1500;
    private static final int FEMALE_FLOOR = 1200;

    private final Clock clock;

    public DailyKcalCalculator(Clock clock) {
        this.clock = clock;
    }

    public int suggest(Gender gender, int birthYear, BigDecimal heightCm,
                       BigDecimal currentWeightKg, Goal goal, ActivityLevel activityLevel) {
        double maintenance = maintenance(gender, birthYear, heightCm, currentWeightKg, activityLevel);
        return toTarget(maintenance, gender, goal);
    }

    /** 공식 유지칼로리(Mifflin-St Jeor BMR × 활동계수). 적응형 TDEE의 폴백 시드로도 재사용된다. */
    public double maintenance(Gender gender, int birthYear, BigDecimal heightCm,
                              BigDecimal currentWeightKg, ActivityLevel activityLevel) {
        int age = Year.now(clock).getValue() - birthYear;
        double bmr = 10 * currentWeightKg.doubleValue() + 6.25 * heightCm.doubleValue() - 5 * age
                + (gender == Gender.MALE ? 5 : -161);
        return bmr * activityLevel.factor();
    }

    /** 유지칼로리 → 일일 목표 — 목표 방향 조정(감량−500/증량+300/유지0)·하한·10단위 반올림. 적응형 추천에도 재사용. */
    public int toTarget(double maintenance, Gender gender, Goal goal) {
        double adjusted = maintenance + (goal == null ? 0 : goal.kcalAdjustment());
        int floor = gender == Gender.MALE ? MALE_FLOOR : FEMALE_FLOOR;
        return Math.max(floor, (int) (Math.round(adjusted / 10.0) * 10));
    }
}
