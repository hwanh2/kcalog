package com.kcalog.domain.food.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * 끼니 세트에 든 음식 하나 — {@link MemberFavoriteMeal} 애그리거트 내부.
 *
 * 영양값은 <b>수량이 이미 반영된 총량</b>이다(meal_item과 같은 규칙). 즐겨찾기 음식이
 * "1회분 기준"을 담는 것과 다르다 — 세트는 "그때 그렇게 먹었던 한 상"을 그대로 보관한다.
 */
@Entity
@Table(name = "member_favorite_meal_item")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MemberFavoriteMealItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false)
    private BigDecimal quantity;

    @Column(nullable = false, length = 20)
    private String unit;

    @Column(nullable = false)
    private int kcal;

    @Column(name = "carb_g", nullable = false)
    private BigDecimal carbG;

    @Column(name = "protein_g", nullable = false)
    private BigDecimal proteinG;

    @Column(name = "fat_g", nullable = false)
    private BigDecimal fatG;

    /** 저장할 때의 순서 — 사진 속 배치 순서가 곧 상 차림 순서라 그대로 보여준다 */
    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    private MemberFavoriteMealItem(String name, BigDecimal quantity, String unit, int kcal,
                                   BigDecimal carbG, BigDecimal proteinG, BigDecimal fatG, int sortOrder) {
        this.name = name;
        this.quantity = quantity;
        this.unit = unit;
        this.kcal = kcal;
        this.carbG = carbG;
        this.proteinG = proteinG;
        this.fatG = fatG;
        this.sortOrder = sortOrder;
    }

    public static MemberFavoriteMealItem of(String name, BigDecimal quantity, String unit, int kcal,
                                            BigDecimal carbG, BigDecimal proteinG, BigDecimal fatG, int sortOrder) {
        return new MemberFavoriteMealItem(name, quantity, unit, kcal, carbG, proteinG, fatG, sortOrder);
    }
}
