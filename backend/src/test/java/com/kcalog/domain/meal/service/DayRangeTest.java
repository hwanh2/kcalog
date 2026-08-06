package com.kcalog.domain.meal.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThat;

class DayRangeTest {

    static final ZoneId KST = ZoneId.of("Asia/Seoul");
    static final LocalDate AUG_6 = LocalDate.of(2026, 8, 6);

    @Test
    @DisplayName("KST 하루는 전날 15:00Z부터 당일 15:00Z까지 (UTC 반개구간)로 변환된다")
    void convertsToUtcInterval() {
        DayRange range = DayRange.of(AUG_6, KST);

        assertThat(range.from()).isEqualTo(Instant.parse("2026-08-05T15:00:00Z"));
        assertThat(range.to()).isEqualTo(Instant.parse("2026-08-06T15:00:00Z"));
    }

    @Test
    @DisplayName("당일 자정 정각(00:00 KST) 식사는 포함된다 (from 경계 포함)")
    void includesStartBoundary() {
        DayRange range = DayRange.of(AUG_6, KST);
        // 2026-08-06 00:00 KST == 2026-08-05T15:00Z
        assertThat(range.contains(Instant.parse("2026-08-05T15:00:00Z"))).isTrue();
    }

    @Test
    @DisplayName("전날 23:59:59 KST 식사는 제외된다 (from 직전)")
    void excludesJustBeforeStart() {
        DayRange range = DayRange.of(AUG_6, KST);
        // 2026-08-05 23:59:59 KST == 2026-08-05T14:59:59Z
        assertThat(range.contains(Instant.parse("2026-08-05T14:59:59Z"))).isFalse();
    }

    @Test
    @DisplayName("당일 23:59:59 KST 식사는 포함된다 (to 직전)")
    void includesLastMoment() {
        DayRange range = DayRange.of(AUG_6, KST);
        // 2026-08-06 23:59:59 KST == 2026-08-06T14:59:59Z
        assertThat(range.contains(Instant.parse("2026-08-06T14:59:59Z"))).isTrue();
    }

    @Test
    @DisplayName("다음날 자정 정각(00:00 KST) 식사는 제외된다 (to 경계 미포함 — 이중 계상 방지)")
    void excludesEndBoundary() {
        DayRange range = DayRange.of(AUG_6, KST);
        // 2026-08-07 00:00 KST == 2026-08-06T15:00Z == range.to()
        assertThat(range.contains(Instant.parse("2026-08-06T15:00:00Z"))).isFalse();
    }
}
