package com.kcalog.domain.food.entity;

import com.kcalog.domain.correction.entity.FoodNames;
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
 * 즐겨찾기 — 회원이 반복해서 담는 음식(카탈로그에서 복사·AI 결과에서 저장·직접 입력).
 * 매칭 키는 정규화된 이름(회원·정규화명 유니크)이라 같은 음식을 다시 저장하면 {@link #update}로 덮어쓴다.
 * 영양값은 quantity·unit 기준 1회분이며, 담을 때 선택 수량에 비례해 계산한다.
 */
@Entity
@Table(name = "member_favorite_food")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MemberFavoriteFood extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long memberId;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "name_normalized", nullable = false, length = 100)
    private String nameNormalized;

    // 카탈로그에서 담은 항목은 이모지를 물려받는다. 직접 만든 항목은 null → 화면이 첫 글자 배지로 그린다
    @Column(length = 16)
    private String emoji;

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

    private MemberFavoriteFood(Long memberId, String name, String emoji, BigDecimal quantity, String unit,
                               int kcal, BigDecimal carbG, BigDecimal proteinG, BigDecimal fatG) {
        this.memberId = memberId;
        this.name = name;
        this.nameNormalized = FoodNames.normalize(name);
        this.emoji = emoji;
        this.quantity = quantity;
        this.unit = unit;
        this.kcal = kcal;
        this.carbG = carbG;
        this.proteinG = proteinG;
        this.fatG = fatG;
    }

    public static MemberFavoriteFood of(Long memberId, String name, String emoji, BigDecimal quantity, String unit,
                                        int kcal, BigDecimal carbG, BigDecimal proteinG, BigDecimal fatG) {
        return new MemberFavoriteFood(memberId, name, emoji, quantity, unit, kcal, carbG, proteinG, fatG);
    }

    /** 같은 음식 재저장 — 최신값으로 덮어쓴다. 표시 이름도 최신 표기로 갱신 */
    public void update(String name, String emoji, BigDecimal quantity, String unit,
                       int kcal, BigDecimal carbG, BigDecimal proteinG, BigDecimal fatG) {
        this.name = name;
        this.nameNormalized = FoodNames.normalize(name);
        this.emoji = emoji;
        this.quantity = quantity;
        this.unit = unit;
        this.kcal = kcal;
        this.carbG = carbG;
        this.proteinG = proteinG;
        this.fatG = fatG;
    }

    public boolean isOwnedBy(Long memberId) {
        return this.memberId.equals(memberId);
    }
}
