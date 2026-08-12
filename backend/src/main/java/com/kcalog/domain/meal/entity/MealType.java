package com.kcalog.domain.meal.entity;

/** 끼니 구분. meal.meal_type은 VARCHAR라 값 추가에 마이그레이션이 필요 없다 */
public enum MealType {
    BREAKFAST, LUNCH, DINNER, SNACK, LATE_NIGHT
}
