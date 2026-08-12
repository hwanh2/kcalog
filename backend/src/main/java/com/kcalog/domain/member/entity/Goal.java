package com.kcalog.domain.member.entity;

import java.math.BigDecimal;

/**
 * 목표 방향 — 일일 칼로리 목표를 유지칼로리에서 얼마나 조정할지 정한다.
 * 목표 체중이 없어도 방향만으로 목표를 낼 수 있게 명시적으로 저장한다(design D2).
 */
public enum Goal {
    CUT(-500),
    MAINTAIN(0),
    BULK(300);

    private final int kcalAdjustment;

    Goal(int kcalAdjustment) {
        this.kcalAdjustment = kcalAdjustment;
    }

    public int kcalAdjustment() {
        return kcalAdjustment;
    }

    /** 방향이 저장되지 않은 회원용 폴백 — 목표 체중과 현재 체중을 비교해 방향을 도출한다 */
    public static Goal fromWeights(BigDecimal currentWeightKg, BigDecimal targetWeightKg) {
        if (targetWeightKg == null || currentWeightKg == null) {
            return MAINTAIN;
        }
        int comparison = targetWeightKg.compareTo(currentWeightKg);
        return comparison < 0 ? CUT : comparison > 0 ? BULK : MAINTAIN;
    }
}
