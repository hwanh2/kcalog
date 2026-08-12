package com.kcalog.domain.food.dto;

import com.kcalog.domain.food.entity.FoodCatalog;
import com.kcalog.domain.food.entity.MemberFavoriteFood;

import java.math.BigDecimal;
import java.util.List;

/**
 * 담을 수 있는 음식 한 항목 — 카탈로그와 즐겨찾기를 한 목록으로 합쳐 내려준다(검색이 둘을 함께 뒤진다).
 * 영양값은 quantity·unit 기준 1회분이며, 담을 때 선택 수량에 비례해 계산한다.
 * emoji는 즐겨찾기에서 null일 수 있다(화면이 이름 첫 글자 배지로 대체).
 */
public record FoodResponse(
        Long id,
        FoodSource source,
        String name,
        String emoji,
        List<String> aliases,
        BigDecimal quantity,
        String unit,
        int kcal,
        BigDecimal carbG,
        BigDecimal proteinG,
        BigDecimal fatG
) {

    public static FoodResponse of(FoodCatalog c) {
        return new FoodResponse(c.getId(), FoodSource.CATALOG, c.getName(), c.getEmoji(), c.aliasList(),
                c.getBaseQuantity(), c.getUnit(), c.getKcal(), c.getCarbG(), c.getProteinG(), c.getFatG());
    }

    public static FoodResponse of(MemberFavoriteFood f) {
        return new FoodResponse(f.getId(), FoodSource.FAVORITE, f.getName(), f.getEmoji(), List.of(),
                f.getQuantity(), f.getUnit(), f.getKcal(), f.getCarbG(), f.getProteinG(), f.getFatG());
    }
}
