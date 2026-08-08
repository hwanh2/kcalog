package com.kcalog.domain.meal.dto;

import com.kcalog.domain.meal.entity.MealType;
import jakarta.validation.Valid;

import java.time.Instant;
import java.util.List;

/** 부분 수정 — mealType·eatenAt은 null이면 유지. items가 있으면 전체 교체(합계 재계산) */
public record UpdateMealRequest(
        MealType mealType,
        Instant eatenAt,
        @Valid List<MealItemRequest> items
) {
}
