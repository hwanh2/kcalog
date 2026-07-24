package com.kcalog.domain.member.service;

import com.kcalog.domain.member.entity.ActivityLevel;
import com.kcalog.domain.member.entity.Gender;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Year;

/**
 * 일일 칼로리 목표 제안 (design D3).
 * Mifflin-St Jeor BMR × 활동계수 + 목표 조정(감량 −500 / 증량 +300 / 유지 0),
 * 하한선(남 1500 / 여 1200) 클램프, 10 단위 반올림. 결과는 제안값이며 최종 확정은 사용자 몫.
 */
@Service
public class DailyKcalCalculator {

    private static final int CUT_ADJUSTMENT = -500;
    private static final int BULK_ADJUSTMENT = 300;
    private static final int MALE_FLOOR = 1500;
    private static final int FEMALE_FLOOR = 1200;

    private final Clock clock;

    public DailyKcalCalculator(Clock clock) {
        this.clock = clock;
    }

    public int suggest(Gender gender, int birthYear, BigDecimal heightCm,
                       BigDecimal currentWeightKg, BigDecimal targetWeightKg, ActivityLevel activityLevel) {
        int age = Year.now(clock).getValue() - birthYear;
        double weight = currentWeightKg.doubleValue();

        double bmr = 10 * weight + 6.25 * heightCm.doubleValue() - 5 * age
                + (gender == Gender.MALE ? 5 : -161);
        double tdee = bmr * activityLevel.factor();

        int comparison = targetWeightKg.compareTo(currentWeightKg);
        double adjusted = tdee + (comparison < 0 ? CUT_ADJUSTMENT : comparison > 0 ? BULK_ADJUSTMENT : 0);

        int floor = gender == Gender.MALE ? MALE_FLOOR : FEMALE_FLOOR;
        return Math.max(floor, (int) (Math.round(adjusted / 10.0) * 10));
    }
}
