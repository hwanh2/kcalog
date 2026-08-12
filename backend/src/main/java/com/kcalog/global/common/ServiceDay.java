package com.kcalog.global.common;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;

/**
 * 섭취 집계의 "하루" — 자정이 아니라 05:00에 바뀐다. 새벽에 먹은 야식이 다음 날로 새지 않게 하기 위함.
 * 섭취 시각(eatenAt)은 실제 시각 그대로 저장하고, 날짜 귀속만 이 경계로 판정한다.
 * <p>
 * 적용: 식사 날짜별 조회·일일 대시보드·기간 리포트·적응형 TDEE·코칭 시그널.
 * 미적용(달력 날짜 유지): 체중 기록(아침 공복 측정이라 달력 기준이 자연스럽다),
 * 일일 분석 횟수 제한(비용 통제 장치이며 카운터 키를 옮길 이유가 없다).
 */
public final class ServiceDay {

    /** 하루가 바뀌는 시각 */
    public static final LocalTime BOUNDARY = LocalTime.of(5, 0);

    // 경계를 한 곳에서만 해석한다 — 날짜 귀속(of)과 구간(startOf/endOf)이 따로 계산하면
    // 경계를 비정시(예: 05:30)로 옮길 때 소리 없이 하루씩 어긋난다
    private static final Duration OFFSET = Duration.between(LocalTime.MIDNIGHT, BOUNDARY);

    /** 그 순간이 속한 서비스 날짜 — 경계 이전이면 전날 */
    public static LocalDate of(Instant instant, ZoneId zone) {
        return instant.atZone(zone).minus(OFFSET).toLocalDate();
    }

    /** 현재 시각 기준의 "오늘" */
    public static LocalDate today(Clock clock) {
        return of(clock.instant(), clock.getZone());
    }

    /** 그 날짜의 시작(05:00) */
    public static Instant startOf(LocalDate date, ZoneId zone) {
        return date.atTime(BOUNDARY).atZone(zone).toInstant();
    }

    /** 그 날짜의 끝(다음 날 05:00) — 반개구간이라 포함하지 않는다 */
    public static Instant endOf(LocalDate date, ZoneId zone) {
        return startOf(date.plusDays(1), zone);
    }

    private ServiceDay() {
    }
}
