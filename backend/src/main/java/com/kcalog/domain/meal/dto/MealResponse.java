package com.kcalog.domain.meal.dto;

import com.kcalog.domain.meal.entity.Meal;
import com.kcalog.domain.meal.entity.MealSource;
import com.kcalog.domain.meal.entity.MealType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public record MealResponse(
        Long id,
        Instant eatenAt,
        MealType mealType,
        MealSource source,
        int totalKcal,
        BigDecimal carbG,
        BigDecimal proteinG,
        BigDecimal fatG,
        String imageUrl,
        List<MealItemResponse> items
) {
    public static MealResponse of(Meal meal) {
        return new MealResponse(
                meal.getId(),
                meal.getEatenAt(),
                meal.getMealType(),
                meal.getSource(),
                meal.getTotalKcal(),
                meal.getCarbG(),
                meal.getProteinG(),
                meal.getFatG(),
                meal.getImageKey() != null ? "/api/photos/" + meal.getImageKey() : null,
                meal.getItems().stream().map(MealItemResponse::of).toList());
    }
}
