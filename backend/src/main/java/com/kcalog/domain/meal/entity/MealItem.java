package com.kcalog.domain.meal.entity;

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
 * 식사 속 개별 음식 — meal 애그리거트 내부. 위치 박스는 오버레이 전용이라 저장하지 않는다.
 * 수량·단위는 표시와 재편집을 위한 메타이며(없을 수 있다), 영양값은 <b>수량이 이미 반영된 총량</b>이다.
 */
@Entity
@Table(name = "meal_item")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MealItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private int kcal;

    @Column(name = "carb_g", nullable = false)
    private BigDecimal carbG;

    @Column(name = "protein_g", nullable = false)
    private BigDecimal proteinG;

    @Column(name = "fat_g", nullable = false)
    private BigDecimal fatG;

    // 섭취량 — "2개", "150g". 없을 수 있다(직접 입력·구 기록)
    private BigDecimal quantity;

    @Column(length = 20)
    private String unit;

    private MealItem(String name, int kcal, BigDecimal carbG, BigDecimal proteinG, BigDecimal fatG,
                     BigDecimal quantity, String unit) {
        this.name = name;
        this.kcal = kcal;
        this.carbG = carbG;
        this.proteinG = proteinG;
        this.fatG = fatG;
        this.quantity = quantity;
        this.unit = unit;
    }

    /** 수량 없이 — 직접 입력처럼 섭취량 개념이 없는 항목 */
    public static MealItem of(String name, int kcal, BigDecimal carbG, BigDecimal proteinG, BigDecimal fatG) {
        return new MealItem(name, kcal, carbG, proteinG, fatG, null, null);
    }

    /** 섭취량과 함께 — 카탈로그·즐겨찾기·AI 분석 항목 */
    public static MealItem of(String name, int kcal, BigDecimal carbG, BigDecimal proteinG, BigDecimal fatG,
                              BigDecimal quantity, String unit) {
        return new MealItem(name, kcal, carbG, proteinG, fatG, quantity, unit);
    }
}
