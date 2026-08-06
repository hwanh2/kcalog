package com.kcalog.domain.meal.dto;

/** 식사 영양값 검증 경계 — 저장·수정 DTO가 공유한다 (컬럼: kcal INTEGER, 탄단지 NUMERIC(5,1)) */
public final class MealValidation {

    public static final long KCAL_MIN = 0;
    public static final long KCAL_MAX = 10_000;
    public static final String MACRO_MIN = "0";
    public static final String MACRO_MAX = "2000";

    private MealValidation() {
    }
}
