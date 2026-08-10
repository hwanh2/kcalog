package com.kcalog.domain.report.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * 기간 리포트 — 주간/월간/총. 목표 달성 요약·탄단지 분포(버킷 스택 막대)·TDEE 시리즈·인사이트. 조회 시 계산.
 * buckets: 주간=요일별, 월간=일별, 총=월별. 각 버킷 값은 그 구간의 일 평균(비교 가능한 "하루치").
 */
public record ReportResponse(
        Period period,
        LocalDate rangeStart,
        LocalDate rangeEnd,
        int daysLogged,
        Integer avgKcal,
        Integer targetKcal,
        Integer onTargetDays,
        BigDecimal avgCarbG,
        BigDecimal avgProteinG,
        BigDecimal avgFatG,
        Integer carbPct,
        Integer proteinPct,
        Integer fatPct,
        Integer carbTargetG,
        Integer proteinTargetG,
        Integer fatTargetG,
        List<Bucket> buckets,
        List<TdeePoint> tdeeSeries,
        List<Insight> insights
) {
    /** 분포 막대 하나 — 라벨 + 일 평균 탄단지·kcal */
    public record Bucket(String label, LocalDate startDate, int kcal,
                         BigDecimal carbG, BigDecimal proteinG, BigDecimal fatG) {
    }

    /** TDEE 시리즈 점 — 버킷 라벨과 정렬 */
    public record TdeePoint(String label, Integer maintenanceKcal, String source) {
    }

    /** 규칙 기반 인사이트 */
    public record Insight(String code, String message) {
    }
}
