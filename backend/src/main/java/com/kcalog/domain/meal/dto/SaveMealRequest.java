package com.kcalog.domain.meal.dto;

import com.kcalog.domain.meal.entity.MealSource;
import com.kcalog.domain.meal.entity.MealType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.util.List;

/** 확인·수정된 음식 항목들을 저장 — 합계는 서버가 항목 합으로 계산한다. 수동 입력은 항목 하나로 전달 */
public record SaveMealRequest(
        @NotNull Instant eatenAt,
        @NotNull MealType mealType,
        @NotNull MealSource source,
        @NotEmpty @Valid List<MealItemRequest> items
) {
}
