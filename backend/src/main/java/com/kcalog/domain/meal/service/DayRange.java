package com.kcalog.domain.meal.service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

/**
 * 특정 시간대의 하루를 UTC Instant 반개구간 [from, to)로 표현.
 * UTC로 저장된 eaten_at을 "현지 날짜"로 조회할 때 자정 경계를 정확히 가른다.
 */
public record DayRange(Instant from, Instant to) {

    public static DayRange of(LocalDate date, ZoneId zone) {
        return new DayRange(
                date.atStartOfDay(zone).toInstant(),
                date.plusDays(1).atStartOfDay(zone).toInstant());
    }

    /** from 포함, to 미포함 — 다음날 자정 정각 식사가 오늘에 이중 계상되지 않도록 */
    public boolean contains(Instant instant) {
        return !instant.isBefore(from) && instant.isBefore(to);
    }
}
