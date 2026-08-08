package com.kcalog.domain.meal.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

import static com.kcalog.domain.meal.dto.MealValidation.KCAL_MAX;
import static com.kcalog.domain.meal.dto.MealValidation.KCAL_MIN;
import static com.kcalog.domain.meal.dto.MealValidation.MACRO_MAX;
import static com.kcalog.domain.meal.dto.MealValidation.MACRO_MIN;

/** 음식별 항목 입력 — 저장·수정 요청의 items 원소 */
public record MealItemRequest(
        @NotBlank String name,
        @NotNull @Min(KCAL_MIN) @Max(KCAL_MAX) Integer kcal,
        @NotNull @DecimalMin(MACRO_MIN) @DecimalMax(MACRO_MAX) @Digits(integer = 4, fraction = 1) BigDecimal carbG,
        @NotNull @DecimalMin(MACRO_MIN) @DecimalMax(MACRO_MAX) @Digits(integer = 4, fraction = 1) BigDecimal proteinG,
        @NotNull @DecimalMin(MACRO_MIN) @DecimalMax(MACRO_MAX) @Digits(integer = 4, fraction = 1) BigDecimal fatG
) {
}
