package com.kcalog.domain.food.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

import static com.kcalog.domain.meal.dto.MealValidation.KCAL_MAX;
import static com.kcalog.domain.meal.dto.MealValidation.KCAL_MIN;
import static com.kcalog.domain.meal.dto.MealValidation.MACRO_MAX;
import static com.kcalog.domain.meal.dto.MealValidation.MACRO_MIN;
import static com.kcalog.domain.meal.dto.MealValidation.MAX_ITEMS;
import static com.kcalog.domain.meal.dto.MealValidation.NAME_MAX;
import static com.kcalog.domain.meal.dto.MealValidation.QUANTITY_MAX;
import static com.kcalog.domain.meal.dto.MealValidation.QUANTITY_MIN;
import static com.kcalog.domain.meal.dto.MealValidation.UNIT_MAX;

/**
 * 끼니 세트 저장 — 분석 결과 시트와 저장된 기록 카드가 모두 이 요청을 쓴다.
 * 같은 이름(정규화 기준)이 이미 있으면 구성을 덮어쓴다(design D3).
 *
 * <p>검증 경계는 {@link com.kcalog.domain.meal.dto.MealValidation}을 **공유한다** — 세트로 만든
 * 기록이 결국 그 검증을 통과해야 하므로, 상한이 다르면 "저장은 됐는데 담을 수 없는 세트"가 생긴다.
 */
public record SaveFavoriteMealRequest(
        @NotBlank @Size(max = NAME_MAX) String name,
        @NotEmpty @Size(max = MAX_ITEMS) @Valid List<Item> items
) {

    public record Item(
            @NotBlank @Size(max = NAME_MAX) String name,
            @NotNull @DecimalMin(QUANTITY_MIN) @DecimalMax(QUANTITY_MAX) @Digits(integer = 4, fraction = 2)
            BigDecimal quantity,
            @NotBlank @Size(max = UNIT_MAX) String unit,
            @NotNull @Min(KCAL_MIN) @Max(KCAL_MAX) Integer kcal,
            @NotNull @DecimalMin(MACRO_MIN) @DecimalMax(MACRO_MAX) @Digits(integer = 4, fraction = 1) BigDecimal carbG,
            @NotNull @DecimalMin(MACRO_MIN) @DecimalMax(MACRO_MAX) @Digits(integer = 4, fraction = 1) BigDecimal proteinG,
            @NotNull @DecimalMin(MACRO_MIN) @DecimalMax(MACRO_MAX) @Digits(integer = 4, fraction = 1) BigDecimal fatG
    ) {
    }
}
