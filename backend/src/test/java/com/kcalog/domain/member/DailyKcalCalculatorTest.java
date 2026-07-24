package com.kcalog.domain.member;

import com.kcalog.domain.member.entity.ActivityLevel;
import com.kcalog.domain.member.entity.Gender;
import com.kcalog.domain.member.service.DailyKcalCalculator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * design D3 스펙 검증 (TDD):
 * BMR(Mifflin-St Jeor) × 활동계수(LOW 1.2 / MID 1.5 / HIGH 1.75)
 * + 목표 조정(감량 −500 / 증량 +300 / 유지 0), 하한선 클램프(남 1500 / 여 1200), 10 단위 반올림.
 * 나이 = 현재연도 − 출생연도.
 */
class DailyKcalCalculatorTest {

    // 테스트 기준 연도 고정: 2026
    private final DailyKcalCalculator calculator =
            new DailyKcalCalculator(Clock.fixed(Instant.parse("2026-07-23T00:00:00Z"), ZoneOffset.UTC));

    private int suggest(Gender gender, int birthYear, String height, String weight, String target, ActivityLevel level) {
        return calculator.suggest(gender, birthYear,
                new BigDecimal(height), new BigDecimal(weight), new BigDecimal(target), level);
    }

    @Test
    @DisplayName("감량 목표(남) — TDEE에서 500을 빼고 10 단위로 반올림한다")
    void maleCut() {
        // BMR = 10×70 + 6.25×175 − 5×36 + 5 = 1618.75, TDEE(MID) = 2428.125, −500 = 1928.125 → 1930
        assertThat(suggest(Gender.MALE, 1990, "175", "70", "65", ActivityLevel.MID)).isEqualTo(1930);
    }

    @Test
    @DisplayName("증량 목표(여) — TDEE에 300을 더한다")
    void femaleBulk() {
        // BMR = 10×50 + 6.25×162 − 5×31 − 161 = 1196.5, TDEE(LOW) = 1435.8, +300 = 1735.8 → 1740
        assertThat(suggest(Gender.FEMALE, 1995, "162", "50", "55", ActivityLevel.LOW)).isEqualTo(1740);
    }

    @Test
    @DisplayName("유지 목표 — 조정 없이 TDEE를 반올림한다")
    void maintain() {
        // BMR = 1618.75, TDEE(HIGH) = 2832.8125 → 2830
        assertThat(suggest(Gender.MALE, 1990, "175", "70", "70", ActivityLevel.HIGH)).isEqualTo(2830);
    }

    @Test
    @DisplayName("하한선 클램프(여) — 계산값이 1200 미만이면 1200으로 올린다")
    void femaleFloor() {
        // BMR = 450 + 937.5 − 330 − 161 = 896.5, TDEE(LOW) = 1075.8, −500 = 575.8 → clamp 1200
        assertThat(suggest(Gender.FEMALE, 1960, "150", "45", "40", ActivityLevel.LOW)).isEqualTo(1200);
    }

    @Test
    @DisplayName("하한선 클램프(남) — 계산값이 1500 미만이면 1500으로 올린다")
    void maleFloor() {
        // BMR = 500 + 1000 − 380 + 5 = 1125, TDEE(LOW) = 1350, −500 = 850 → clamp 1500
        assertThat(suggest(Gender.MALE, 1950, "160", "50", "45", ActivityLevel.LOW)).isEqualTo(1500);
    }
}
