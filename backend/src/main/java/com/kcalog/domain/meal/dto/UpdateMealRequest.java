package com.kcalog.domain.meal.dto;

import com.kcalog.domain.meal.entity.MealType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;

import static com.kcalog.domain.meal.dto.MealValidation.MAX_ITEMS;

/** 부분 수정 — mealType·eatenAt은 null이면 유지. items는 null이면 유지, 있으면 전체 교체.
 *  @Size(min=1)은 null을 통과시키므로(유지), 빈 배열([])만 400으로 거부한다 */
public record UpdateMealRequest(
        MealType mealType,
        Instant eatenAt,
        @Size(min = 1, max = MAX_ITEMS) @Valid List<MealItemRequest> items
) {
}
