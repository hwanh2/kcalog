package com.kcalog.domain.food.dto;

import com.kcalog.domain.food.entity.MemberFavoriteMeal;
import com.kcalog.domain.food.entity.MemberFavoriteMealItem;

import java.math.BigDecimal;
import java.util.List;

/**
 * 끼니 세트 한 건 — 목록에서 담기 전에 무엇인지 알 수 있도록 합계와 항목 수를 함께 담는다.
 * 항목 영양값은 수량이 이미 반영된 총량이다.
 */
public record FavoriteMealResponse(
        Long id,
        String name,
        int itemCount,
        int totalKcal,
        BigDecimal carbG,
        BigDecimal proteinG,
        BigDecimal fatG,
        List<Item> items
) {

    public record Item(
            String name,
            BigDecimal quantity,
            String unit,
            int kcal,
            BigDecimal carbG,
            BigDecimal proteinG,
            BigDecimal fatG
    ) {

        static Item of(MemberFavoriteMealItem item) {
            return new Item(item.getName(), item.getQuantity(), item.getUnit(), item.getKcal(),
                    item.getCarbG(), item.getProteinG(), item.getFatG());
        }
    }

    public static FavoriteMealResponse of(MemberFavoriteMeal meal) {
        return new FavoriteMealResponse(
                meal.getId(), meal.getName(), meal.getItems().size(),
                meal.totalKcal(), meal.totalCarbG(), meal.totalProteinG(), meal.totalFatG(),
                meal.getItems().stream().map(Item::of).toList());
    }
}
