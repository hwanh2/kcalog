package com.kcalog.domain.meal.dto;

import com.kcalog.domain.meal.entity.MealType;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import java.math.BigDecimal;
import java.time.Instant;

import static com.kcalog.domain.meal.dto.MealValidation.KCAL_MAX;
import static com.kcalog.domain.meal.dto.MealValidation.KCAL_MIN;
import static com.kcalog.domain.meal.dto.MealValidation.MACRO_MAX;
import static com.kcalog.domain.meal.dto.MealValidation.MACRO_MIN;

/** 부분 수정 — null 필드는 변경하지 않는다. 검증은 값이 있을 때만 적용 (source는 수정 불가) */
public record UpdateMealRequest(
        MealType mealType,
        Instant eatenAt,
        @Min(KCAL_MIN) @Max(KCAL_MAX) Integer totalKcal,
        @DecimalMin(MACRO_MIN) @DecimalMax(MACRO_MAX) @Digits(integer = 4, fraction = 1) BigDecimal carbG,
        @DecimalMin(MACRO_MIN) @DecimalMax(MACRO_MAX) @Digits(integer = 4, fraction = 1) BigDecimal proteinG,
        @DecimalMin(MACRO_MIN) @DecimalMax(MACRO_MAX) @Digits(integer = 4, fraction = 1) BigDecimal fatG
) {
}
