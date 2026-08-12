package com.kcalog.domain.correction.dto;

import com.kcalog.domain.correction.entity.FoodCorrection;
import com.kcalog.domain.correction.entity.FoodNames;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * 분석에 전달하는 개인 보정치 경량 뷰 — 프롬프트 주입(display + 영양값)과 코드 덮어쓰기(normalized 매칭)에 함께 쓴다.
 * 엔티티를 서비스 경계 밖으로 노출하지 않기 위한 읽기 전용 표현(design D5 Open Question).
 * <p>
 * 영양값은 {@code baseQuantity}{@code unit} 기준의 <b>총량</b>이다(예: 삶은달걀 2개 = 140kcal).
 * 그래서 AI가 다른 양을 찾아내면 {@link #scaledTo}로 비례 조정해야 한다.
 */
public record PersonalCorrection(
        String displayName,
        String normalizedName,
        int kcal,
        BigDecimal carbG,
        BigDecimal proteinG,
        BigDecimal fatG,
        BigDecimal baseQuantity,
        String unit
) {
    public static PersonalCorrection from(FoodCorrection c) {
        return new PersonalCorrection(
                c.getFoodNameDisplay(), c.getFoodNameNormalized(),
                c.getKcal(), c.getCarbG(), c.getProteinG(), c.getFatG(),
                c.getBaseQuantity(), c.getUnit());
    }

    /**
     * AI가 찾아낸 섭취량에 맞춰 비례 조정한 영양값.
     * <p>
     * 조정은 <b>단위가 같을 때만</b> 한다 — "2개 → 1개"는 절반이지만 "2개 → 1조각"은 환산 규칙이 없다.
     * 조정할 수 없으면(단위 불일치·수량 없음·양수 아님) 저장된 값을 그대로 쓴다. 잘못 환산한 값보다
     * 사용자가 확정한 값을 그대로 쓰는 편이 예측 가능하다.
     */
    public Scaled scaledTo(BigDecimal amount, String amountUnit) {
        if (!canScale(amount, amountUnit)) {
            return new Scaled(kcal, carbG, proteinG, fatG);
        }
        BigDecimal ratio = amount.divide(baseQuantity, 6, RoundingMode.HALF_UP);
        return new Scaled(
                BigDecimal.valueOf(kcal).multiply(ratio).setScale(0, RoundingMode.HALF_UP).intValue(),
                scale(carbG, ratio), scale(proteinG, ratio), scale(fatG, ratio));
    }

    private boolean canScale(BigDecimal amount, String amountUnit) {
        return baseQuantity != null && baseQuantity.signum() > 0
                && amount != null && amount.signum() > 0
                && FoodNames.normalize(unit).equals(FoodNames.normalize(amountUnit))
                && !FoodNames.normalize(unit).isEmpty();
    }

    private static BigDecimal scale(BigDecimal value, BigDecimal ratio) {
        return value.multiply(ratio).setScale(1, RoundingMode.HALF_UP);
    }

    /** 섭취량에 맞춰 조정된 영양값 */
    public record Scaled(int kcal, BigDecimal carbG, BigDecimal proteinG, BigDecimal fatG) {
    }
}
