package com.kcalog.domain.meal.service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

/**
 * 특정 시간대의 하루를 UTC Instant 반개구간 [from, to)로 표현.
 * UTC로 저장된 eaten_at을 "현지 날짜"로 조회할 때 자정 경계를 정확히 가른다.
 * 실제 경계 판정(from 포함, to 미포함)은 리포지토리 파생 쿼리(GreaterThanEqual + LessThan)가 수행한다.
 */
public record DayRange(Instant from, Instant to) {

    public static DayRange of(LocalDate date, ZoneId zone) {
        return new DayRange(
                date.atStartOfDay(zone).toInstant(),
                date.plusDays(1).atStartOfDay(zone).toInstant());
    }
}
