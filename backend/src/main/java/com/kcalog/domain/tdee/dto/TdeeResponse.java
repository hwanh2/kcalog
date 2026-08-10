package com.kcalog.domain.tdee.dto;

/**
 * 적응형 유지칼로리 응답. status=OK면 source=ADAPTIVE(실측), INSUFFICIENT_DATA면 source=FORMULA(공식 시드).
 * maintenanceKcal·recommendedTargetKcal은 프로필·체중 기록이 없으면 null. 목표 적용은 기존 회원 PATCH로.
 */
public record TdeeResponse(
        String status,                  // OK | INSUFFICIENT_DATA
        Integer maintenanceKcal,        // 유지칼로리(실측 또는 공식), 계산 불가 시 null
        String source,                  // ADAPTIVE | FORMULA
        Integer currentTargetKcal,      // 현재 회원 목표
        Integer recommendedTargetKcal,  // 유지칼로리 + 조정, 목표체중 없으면 null
        int windowDays,
        double coverage                 // 창 내 섭취 로깅 커버리지(0~1)
) {
    public static TdeeResponse insufficient(Integer currentTarget, int windowDays) {
        return new TdeeResponse("INSUFFICIENT_DATA", null, "FORMULA", currentTarget, null, windowDays, 0);
    }
}
