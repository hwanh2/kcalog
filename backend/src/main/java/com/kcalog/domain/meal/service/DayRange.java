package com.kcalog.domain.meal.service;

import com.kcalog.global.common.ServiceDay;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

/**
 * 특정 시간대의 하루를 UTC Instant 반개구간 [from, to)로 표현.
 * UTC로 저장된 eaten_at을 "현지 날짜"로 조회할 때 경계를 정확히 가른다.
 * 경계는 자정이 아니라 {@link ServiceDay}의 05:00 — 새벽 기록이 다음 날로 새지 않게 한다.
 * 실제 경계 판정(from 포함, to 미포함)은 리포지토리 파생 쿼리(GreaterThanEqual + LessThan)가 수행한다.
 */
public record DayRange(Instant from, Instant to) {

    public static DayRange of(LocalDate date, ZoneId zone) {
        return new DayRange(ServiceDay.startOf(date, zone), ServiceDay.endOf(date, zone));
    }
}
