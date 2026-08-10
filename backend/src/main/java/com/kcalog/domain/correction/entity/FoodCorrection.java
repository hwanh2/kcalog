package com.kcalog.domain.correction.entity;

import com.kcalog.global.common.BaseEntity;
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
 * 개인 영양 보정치 (차별점 #1: 학습형 수정). 회원이 정정한 음식의 확정 영양값을 보관한다.
 * 매칭 키는 정규화된 음식명(회원·정규화명 유니크). 재정정은 {@link #updateNutrition}으로 최신값 덮어쓰기(design D2).
 */
@Entity
@Table(name = "food_correction")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class FoodCorrection extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long memberId;

    @Column(name = "food_name_normalized", nullable = false)
    private String foodNameNormalized;

    @Column(name = "food_name_display", nullable = false)
    private String foodNameDisplay;

    @Column(nullable = false)
    private int kcal;

    @Column(name = "carb_g", nullable = false)
    private BigDecimal carbG;

    @Column(name = "protein_g", nullable = false)
    private BigDecimal proteinG;

    @Column(name = "fat_g", nullable = false)
    private BigDecimal fatG;

    private FoodCorrection(Long memberId, String display, int kcal,
                           BigDecimal carbG, BigDecimal proteinG, BigDecimal fatG) {
        this.memberId = memberId;
        this.foodNameDisplay = display;
        this.foodNameNormalized = FoodNames.normalize(display);
        this.kcal = kcal;
        this.carbG = carbG;
        this.proteinG = proteinG;
        this.fatG = fatG;
    }

    /** 정정값으로 새 보정치 생성 — 정규화명은 표시명에서 파생 */
    public static FoodCorrection of(Long memberId, String display, int kcal,
                                    BigDecimal carbG, BigDecimal proteinG, BigDecimal fatG) {
        return new FoodCorrection(memberId, display, kcal, carbG, proteinG, fatG);
    }

    /** 재정정 — 최신값으로 덮어쓰기(평균 아님). 표시명도 최신 표기로 갱신 */
    public void updateNutrition(String display, int kcal,
                                BigDecimal carbG, BigDecimal proteinG, BigDecimal fatG) {
        this.foodNameDisplay = display;
        this.kcal = kcal;
        this.carbG = carbG;
        this.proteinG = proteinG;
        this.fatG = fatG;
    }
}
