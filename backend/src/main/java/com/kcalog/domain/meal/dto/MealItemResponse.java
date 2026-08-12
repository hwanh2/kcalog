package com.kcalog.domain.meal.dto;

import com.kcalog.domain.meal.entity.MealItem;

import java.math.BigDecimal;

/** 저장된 음식 항목 — quantity·unit은 섭취량이 있는 항목만 채워진다(없으면 null) */
public record MealItemResponse(String name, int kcal, BigDecimal carbG, BigDecimal proteinG, BigDecimal fatG,
                               BigDecimal quantity, String unit) {

    public static MealItemResponse of(MealItem item) {
        return new MealItemResponse(item.getName(), item.getKcal(), item.getCarbG(), item.getProteinG(),
                item.getFatG(), item.getQuantity(), item.getUnit());
    }
}
