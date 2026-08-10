package com.kcalog.domain.meal.dto;

/** 매크로 g당 칼로리 계수 — 탄·단 4, 지 9. 목표·비율 계산이 공유한다(중복 제거). */
public final class MacroKcal {

    public static final int CARB = 4;
    public static final int PROTEIN = 4;
    public static final int FAT = 9;

    private MacroKcal() {
    }
}
