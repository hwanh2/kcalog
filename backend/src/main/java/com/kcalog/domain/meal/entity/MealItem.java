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

/** 식사 속 개별 음식 — meal 애그리거트 내부. 위치 박스는 오버레이 전용이라 저장하지 않는다 */
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

    private MealItem(String name, int kcal, BigDecimal carbG, BigDecimal proteinG, BigDecimal fatG) {
        this.name = name;
        this.kcal = kcal;
        this.carbG = carbG;
        this.proteinG = proteinG;
        this.fatG = fatG;
    }

    public static MealItem of(String name, int kcal, BigDecimal carbG, BigDecimal proteinG, BigDecimal fatG) {
        return new MealItem(name, kcal, carbG, proteinG, fatG);
    }
}
