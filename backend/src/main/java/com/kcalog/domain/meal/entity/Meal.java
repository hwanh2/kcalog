package com.kcalog.domain.meal.entity;

import com.kcalog.global.common.BaseEntity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;

/** 한 끼 식사 — 음식별 항목(meal_item)의 애그리거트 루트. 합계(total_*)는 항목 합으로 비정규화 */
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

    @Column(name = "carb_g", nullable = false)
    private BigDecimal carbG;

    @Column(name = "protein_g", nullable = false)
    private BigDecimal proteinG;

    @Column(name = "fat_g", nullable = false)
    private BigDecimal fatG;

    // 연결된 사진 스토리지 key(`{memberId}/{uuid}`). 수동 입력·구 기록은 null
    @Column(name = "image_key")
    private String imageKey;

    // 애그리거트 내부 — 단방향 @OneToMany + join column, cascade·orphanRemoval로 생명주기를 meal이 관리
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "meal_id", nullable = false)
    private final List<MealItem> items = new ArrayList<>();

    private Meal(Long memberId, Instant eatenAt, MealType mealType, MealSource source) {
        this.memberId = memberId;
        this.eatenAt = eatenAt;
        this.mealType = mealType;
        this.source = source;
    }

    public static Meal record(Long memberId, Instant eatenAt, MealType mealType, MealSource source,
                              List<MealItem> items) {
        Meal meal = new Meal(memberId, eatenAt, mealType, source);
        meal.replaceItems(items);
        return meal;
    }

    /** 항목 전체 교체 후 합계 재계산 — 저장·수정 공용 */
    public void replaceItems(List<MealItem> newItems) {
        items.clear();
        items.addAll(newItems);
        recalculateTotals();
    }

    /** 분석 작업의 사진을 이 식사에 연결 (확인 저장 시) */
    public void attachImage(String imageKey) {
        this.imageKey = imageKey;
    }

    /** 끼니·시각 부분 수정 (null이면 유지). 항목은 replaceItems로 별도 교체 */
    public void updateMeta(MealType mealType, Instant eatenAt) {
        if (mealType != null) this.mealType = mealType;
        if (eatenAt != null) this.eatenAt = eatenAt;
    }

    private void recalculateTotals() {
        this.totalKcal = items.stream().mapToInt(MealItem::getKcal).sum();
        this.carbG = sum(MealItem::getCarbG);
        this.proteinG = sum(MealItem::getProteinG);
        this.fatG = sum(MealItem::getFatG);
    }

    private BigDecimal sum(Function<MealItem, BigDecimal> field) {
        return items.stream().map(field).reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
