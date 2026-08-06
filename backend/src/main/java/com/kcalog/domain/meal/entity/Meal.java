package com.kcalog.domain.meal.entity;

import com.kcalog.global.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;

/** 한 끼 식사 — 사진 단위 총량(칼로리·탄단지). meal_item 분리는 1차 비범위 */
@Entity
@Table(name = "meal")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Meal extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long memberId;

    @Column(nullable = false)
    private Instant eatenAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MealType mealType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MealSource source;

    @Column(nullable = false)
    private int totalKcal;

    // 트레일링 단일 대문자(carbG)는 기본 네이밍 전략이 carbg로 매핑 → 컬럼명 명시로 carb_g에 맞춘다
    @Column(name = "carb_g", nullable = false)
    private BigDecimal carbG;

    @Column(name = "protein_g", nullable = false)
    private BigDecimal proteinG;

    @Column(name = "fat_g", nullable = false)
    private BigDecimal fatG;

    private Meal(Long memberId, Instant eatenAt, MealType mealType, MealSource source,
                 int totalKcal, BigDecimal carbG, BigDecimal proteinG, BigDecimal fatG) {
        this.memberId = memberId;
        this.eatenAt = eatenAt;
        this.mealType = mealType;
        this.source = source;
        this.totalKcal = totalKcal;
        this.carbG = carbG;
        this.proteinG = proteinG;
        this.fatG = fatG;
    }

    public static Meal record(Long memberId, Instant eatenAt, MealType mealType, MealSource source,
                              int totalKcal, BigDecimal carbG, BigDecimal proteinG, BigDecimal fatG) {
        return new Meal(memberId, eatenAt, mealType, source, totalKcal, carbG, proteinG, fatG);
    }

    /** 부분 수정 — null 인자는 변경하지 않는다 (source는 수정 대상 아님) */
    public void update(MealType mealType, Instant eatenAt,
                       Integer totalKcal, BigDecimal carbG, BigDecimal proteinG, BigDecimal fatG) {
        if (mealType != null) this.mealType = mealType;
        if (eatenAt != null) this.eatenAt = eatenAt;
        if (totalKcal != null) this.totalKcal = totalKcal;
        if (carbG != null) this.carbG = carbG;
        if (proteinG != null) this.proteinG = proteinG;
        if (fatG != null) this.fatG = fatG;
    }
}
