package com.kcalog.domain.dashboard.dto;

import com.kcalog.domain.meal.entity.MealType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/** 하루 대시보드 — 해당일 섭취 합계·목표(칼로리·탄단지)·잔여·식사 타임라인.
 *  탄단지 구성 비율은 gram 합계(carbG/proteinG/fatG)로부터 클라이언트가 파생한다.
 *  탄단지 목표(carb/protein/fatTargetG)는 dailyKcalTarget에서 50/30/20으로 파생(design D3).
 *  dailyKcalTarget이 null(온보딩 미완)이면 remainingKcal·탄단지 목표도 모두 null */
public record DashboardResponse(
        int totalKcal,
        BigDecimal carbG,
        BigDecimal proteinG,
        BigDecimal fatG,
        Integer dailyKcalTarget,
        Integer remainingKcal,
        Integer carbTargetG,
        Integer proteinTargetG,
        Integer fatTargetG,
        List<TimelineEntry> timeline
) {
    /** 타임라인 한 항목 — 섭취 시각·끼니·총 칼로리 */
    public record TimelineEntry(Long id, Instant eatenAt, MealType mealType, int totalKcal) {
    }
}
