package com.kcalog.domain.meal.dto;

import com.kcalog.domain.meal.entity.MealItem;

import java.math.BigDecimal;

public record MealItemResponse(String name, int kcal, BigDecimal carbG, BigDecimal proteinG, BigDecimal fatG) {

    public static MealItemResponse of(MealItem item) {
        return new MealItemResponse(item.getName(), item.getKcal(), item.getCarbG(), item.getProteinG(), item.getFatG());
    }
}
