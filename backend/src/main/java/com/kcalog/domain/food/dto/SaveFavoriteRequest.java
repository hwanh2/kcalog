package com.kcalog.domain.food.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

import static com.kcalog.domain.meal.dto.MealValidation.KCAL_MAX;
import static com.kcalog.domain.meal.dto.MealValidation.KCAL_MIN;
import static com.kcalog.domain.meal.dto.MealValidation.MACRO_MAX;
import static com.kcalog.domain.meal.dto.MealValidation.MACRO_MIN;
import static com.kcalog.domain.meal.dto.MealValidation.NAME_MAX;
import static com.kcalog.domain.meal.dto.MealValidation.QUANTITY_MAX;
import static com.kcalog.domain.meal.dto.MealValidation.QUANTITY_MIN;
import static com.kcalog.domain.meal.dto.MealValidation.UNIT_MAX;

/**
 * 즐겨찾기 저장 — 카탈로그에서 복사·AI 결과에서 저장·직접 입력이 모두 이 요청을 쓴다.
 * rememberForAnalysis=true면 같은 값을 개인 보정치로도 저장한다(1단위 기준 환산). 기본 false —
 * 담기 편하려고 누른 즐겨찾기가 AI 분석 결과까지 바꾸지 않게 하기 위함(design D6).
 */
public record SaveFavoriteRequest(
        @NotBlank @Size(max = NAME_MAX) String name,
        @Size(max = 16) String emoji,
        @NotNull @DecimalMin(QUANTITY_MIN) @DecimalMax(QUANTITY_MAX) @Digits(integer = 4, fraction = 2)
        BigDecimal quantity,
        @NotBlank @Size(max = UNIT_MAX) String unit,
        @NotNull @Min(KCAL_MIN) @Max(KCAL_MAX) Integer kcal,
        @NotNull @DecimalMin(MACRO_MIN) @DecimalMax(MACRO_MAX) @Digits(integer = 4, fraction = 1) BigDecimal carbG,
        @NotNull @DecimalMin(MACRO_MIN) @DecimalMax(MACRO_MAX) @Digits(integer = 4, fraction = 1) BigDecimal proteinG,
        @NotNull @DecimalMin(MACRO_MIN) @DecimalMax(MACRO_MAX) @Digits(integer = 4, fraction = 1) BigDecimal fatG,
        Boolean rememberForAnalysis
) {
    public boolean shouldRemember() {
        return Boolean.TRUE.equals(rememberForAnalysis);
    }
}
