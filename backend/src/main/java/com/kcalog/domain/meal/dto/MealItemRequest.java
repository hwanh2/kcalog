package com.kcalog.domain.meal.dto;

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

/** 음식별 항목 입력 — 저장·수정 요청의 items 원소.
 *  quantity·unit은 섭취량 표시용 선택 입력이며, 영양값은 이미 수량이 반영된 총량이다.
 *  remember=true면 저장 시 이 항목의 확정 영양값을 개인 보정치로 학습(upsert)한다(차별점 #1). 기본 false. */
public record MealItemRequest(
        @NotBlank @Size(max = NAME_MAX) String name,
        @NotNull @Min(KCAL_MIN) @Max(KCAL_MAX) Integer kcal,
        @NotNull @DecimalMin(MACRO_MIN) @DecimalMax(MACRO_MAX) @Digits(integer = 4, fraction = 1) BigDecimal carbG,
        @NotNull @DecimalMin(MACRO_MIN) @DecimalMax(MACRO_MAX) @Digits(integer = 4, fraction = 1) BigDecimal proteinG,
        @NotNull @DecimalMin(MACRO_MIN) @DecimalMax(MACRO_MAX) @Digits(integer = 4, fraction = 1) BigDecimal fatG,
        @DecimalMin(QUANTITY_MIN) @DecimalMax(QUANTITY_MAX) @Digits(integer = 4, fraction = 2) BigDecimal quantity,
        @Size(max = UNIT_MAX) String unit,
        Boolean remember
) {
    /** 미지정(null)은 기억하지 않음으로 취급 */
    public boolean shouldRemember() {
        return Boolean.TRUE.equals(remember);
    }
}
