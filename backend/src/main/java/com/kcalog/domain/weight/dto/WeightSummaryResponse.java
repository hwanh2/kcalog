package com.kcalog.domain.weight.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** 체중 탭 요약 — 표시 구간의 원시+추세 점, 최신값, BMI, 연속 기록, 목표 예상.
 *  points는 표시 구간만(EMA는 이전 히스토리로 seed됨). 기록이 없으면 points 빈 목록·latest null. */
public record WeightSummaryResponse(
        List<Point> points,
        BigDecimal latestKg,
        BigDecimal latestTrendKg,
        BmiInfo bmi,
        int streakDays,
        ProjectionInfo projection
) {
    /** 하루 점 — 원시 체중과 EMA 추세값 */
    public record Point(LocalDate logDate, BigDecimal weightKg, BigDecimal trendKg) {
    }
}
