package com.kcalog.domain.correction.dto;

import com.kcalog.domain.correction.entity.FoodCorrection;

import java.math.BigDecimal;

/**
 * 분석에 전달하는 개인 보정치 경량 뷰 — 프롬프트 주입(display + 영양값)과 코드 덮어쓰기(normalized 매칭)에 함께 쓴다.
 * 엔티티를 서비스 경계 밖으로 노출하지 않기 위한 읽기 전용 표현(design D5 Open Question).
 */
public record PersonalCorrection(
        String displayName,
        String normalizedName,
        int kcal,
        BigDecimal carbG,
        BigDecimal proteinG,
        BigDecimal fatG
) {
    public static PersonalCorrection from(FoodCorrection c) {
        return new PersonalCorrection(
                c.getFoodNameDisplay(), c.getFoodNameNormalized(),
                c.getKcal(), c.getCarbG(), c.getProteinG(), c.getFatG());
    }
}
