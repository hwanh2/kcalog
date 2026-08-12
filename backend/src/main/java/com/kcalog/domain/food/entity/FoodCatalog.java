package com.kcalog.domain.food.entity;

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
import java.util.Arrays;
import java.util.List;

/**
 * 큐레이션 음식 카탈로그 — 모든 회원이 공유하는 읽기 전용 참조 데이터(시드로 관리).
 * 영양값은 baseQuantity 기준 1회분이며, 담을 때 선택 수량에 비례해 계산한다.
 */
@Entity
@Table(name = "food_catalog")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class FoodCatalog extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 16)
    private String emoji;

    // 검색 동의어(쉼표 구분) — "계란"으로 "삶은달걀"을 찾게 한다. 없으면 빈 문자열/null
    @Column(length = 200)
    private String aliases;

    @Column(name = "base_quantity", nullable = false)
    private BigDecimal baseQuantity;

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

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    /** 별칭 목록 — 저장은 쉼표 구분 문자열, 사용은 목록으로 */
    public List<String> aliasList() {
        if (aliases == null || aliases.isBlank()) {
            return List.of();
        }
        return Arrays.stream(aliases.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toList();
    }
}
