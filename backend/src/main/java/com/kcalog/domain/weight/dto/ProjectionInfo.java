package com.kcalog.domain.weight.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/** 목표 체중 도달 예상. ON_TRACK일 때만 projectedDate·weeks·weeklyRateKg가 채워진다.
 *  INSUFFICIENT_DATA(데이터 부족)·NOT_APPROACHING(추세가 목표에서 멀어짐·평평)·NO_GOAL(목표 없음)은 날짜 없음. */
public record ProjectionInfo(ProjectionStatus status, BigDecimal targetKg,
                             LocalDate projectedDate, Integer weeks, BigDecimal weeklyRateKg) {

    public enum ProjectionStatus {
        ON_TRACK, INSUFFICIENT_DATA, NOT_APPROACHING, NO_GOAL
    }

    public static ProjectionInfo noGoal() {
        return new ProjectionInfo(ProjectionStatus.NO_GOAL, null, null, null, null);
    }

    public static ProjectionInfo of(ProjectionStatus status, BigDecimal targetKg) {
        return new ProjectionInfo(status, targetKg, null, null, null);
    }
}
