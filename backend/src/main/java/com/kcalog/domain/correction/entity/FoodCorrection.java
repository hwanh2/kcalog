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
 * <p>
 * 영양값은 baseQuantity·unit 기준의 <b>총량</b>이다 — 분석에 반영할 때 같은 단위면 비례 조정한다.
 * 수량을 모르는 항목(직접 입력·구 데이터)은 두 필드가 null이며, 이때는 저장값을 그대로 쓴다.
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

    // 영양값이 어느 섭취량 기준인지 — 모르면 null(그때는 조정 없이 저장값을 그대로 쓴다)
    @Column(name = "base_quantity")
    private BigDecimal baseQuantity;

    @Column(length = 20)
    private String unit;

    private FoodCorrection(Long memberId, String display, int kcal,
                           BigDecimal carbG, BigDecimal proteinG, BigDecimal fatG,
                           BigDecimal baseQuantity, String unit) {
        this.memberId = memberId;
        this.foodNameDisplay = display;
        this.foodNameNormalized = FoodNames.normalize(display);
        this.kcal = kcal;
        this.carbG = carbG;
        this.proteinG = proteinG;
        this.fatG = fatG;
        this.baseQuantity = baseQuantity;
        this.unit = unit;
    }

    /** 정정값으로 새 보정치 생성 — 정규화명은 표시명에서 파생. 섭취량을 모르면 baseQuantity·unit을 null로 */
    public static FoodCorrection of(Long memberId, String display, int kcal,
                                    BigDecimal carbG, BigDecimal proteinG, BigDecimal fatG,
                                    BigDecimal baseQuantity, String unit) {
        return new FoodCorrection(memberId, display, kcal, carbG, proteinG, fatG, baseQuantity, unit);
    }

    /** 재정정 — 최신값으로 덮어쓰기(평균 아님). 표시명·기준 섭취량도 최신값으로 갱신 */
    public void updateNutrition(String display, int kcal,
                                BigDecimal carbG, BigDecimal proteinG, BigDecimal fatG,
                                BigDecimal baseQuantity, String unit) {
        this.foodNameDisplay = display;
        this.kcal = kcal;
        this.carbG = carbG;
        this.proteinG = proteinG;
        this.fatG = fatG;
        this.baseQuantity = baseQuantity;
        this.unit = unit;
    }
}
