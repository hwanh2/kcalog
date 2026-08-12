package com.kcalog.domain.meal.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 현지 날짜 → UTC 반개구간 변환만 검증한다. 하루 경계는 자정이 아니라 05:00(ServiceDay)이다.
 * 경계 포함/미포함 판정은 리포지토리 쿼리가 수행하므로 통합 테스트(MealIntegrationTest.dayBoundary)에서 확인한다.
 */
class DayRangeTest {

    static final ZoneId KST = ZoneId.of("Asia/Seoul");

    @Test
    @DisplayName("KST 하루는 당일 20:00Z(포함)부터 다음날 20:00Z(미포함)까지로 변환된다")
    void convertsToUtcInterval() {
        DayRange range = DayRange.of(LocalDate.of(2026, 8, 6), KST);

        // 2026-08-06 05:00 KST == 2026-08-05T20:00Z, 2026-08-07 05:00 KST == 2026-08-06T20:00Z
        assertThat(range.from()).isEqualTo(Instant.parse("2026-08-05T20:00:00Z"));
        assertThat(range.to()).isEqualTo(Instant.parse("2026-08-06T20:00:00Z"));
    }

    @Test
    @DisplayName("from은 당일 05:00 KST, to는 다음날 05:00 KST에 정확히 대응한다")
    void boundariesMapToServiceDayStart() {
        DayRange range = DayRange.of(LocalDate.of(2026, 8, 6), KST);

        assertThat(range.from().atZone(KST).toLocalTime()).isEqualTo(LocalTime.of(5, 0));
        assertThat(range.from().atZone(KST).toLocalDate()).isEqualTo(LocalDate.of(2026, 8, 6));
        assertThat(range.to().atZone(KST).toLocalTime()).isEqualTo(LocalTime.of(5, 0));
        assertThat(range.to().atZone(KST).toLocalDate()).isEqualTo(LocalDate.of(2026, 8, 7));
    }
}
