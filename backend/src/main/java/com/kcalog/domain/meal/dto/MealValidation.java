package com.kcalog.domain.meal.dto;

/** 식사 영양값 검증 경계 — 저장·수정 DTO가 공유한다 (컬럼: kcal INTEGER, 탄단지 NUMERIC(5,1)) */
public final class MealValidation {

    public static final long KCAL_MIN = 0;
    public static final long KCAL_MAX = 10_000;
    public static final String MACRO_MIN = "0";
    public static final String MACRO_MAX = "2000";
    public static final int NAME_MAX = 100;      // meal_item.name VARCHAR(100)
    public static final int MAX_ITEMS = 30;       // 한 끼 항목 개수 상한 (자원 소진·합계 오버플로 방지)
    public static final String QUANTITY_MIN = "0.01"; // 0은 "먹지 않음"이라 항목으로 남길 이유가 없다
    public static final String QUANTITY_MAX = "9999";  // meal_item.quantity NUMERIC(6,2)
    public static final int UNIT_MAX = 20;       // meal_item.unit VARCHAR(20)

    private MealValidation() {
    }
}
