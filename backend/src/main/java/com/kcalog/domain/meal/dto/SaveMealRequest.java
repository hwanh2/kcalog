package com.kcalog.domain.meal.dto;

import com.kcalog.domain.meal.entity.MealSource;
import com.kcalog.domain.meal.entity.MealType;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.Instant;

import static com.kcalog.domain.meal.dto.MealValidation.KCAL_MAX;
import static com.kcalog.domain.meal.dto.MealValidation.KCAL_MIN;
import static com.kcalog.domain.meal.dto.MealValidation.MACRO_MAX;
import static com.kcalog.domain.meal.dto.MealValidation.MACRO_MIN;

/** 확인·수정된 식사 영양값 저장 — 사진 없이 수동 입력(source=MANUAL)도 이 경로를 쓴다 */
public record SaveMealRequest(
        @NotNull Instant eatenAt,
        @NotNull MealType mealType,
        @NotNull MealSource source,
        @NotNull @Min(KCAL_MIN) @Max(KCAL_MAX) Integer totalKcal,
        @NotNull @DecimalMin(MACRO_MIN) @DecimalMax(MACRO_MAX) @Digits(integer = 4, fraction = 1) BigDecimal carbG,
        @NotNull @DecimalMin(MACRO_MIN) @DecimalMax(MACRO_MAX) @Digits(integer = 4, fraction = 1) BigDecimal proteinG,
        @NotNull @DecimalMin(MACRO_MIN) @DecimalMax(MACRO_MAX) @Digits(integer = 4, fraction = 1) BigDecimal fatG
) {
}
