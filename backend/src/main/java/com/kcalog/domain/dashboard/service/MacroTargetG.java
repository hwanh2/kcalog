package com.kcalog.domain.dashboard.service;

import com.kcalog.domain.meal.dto.MacroKcal;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * 매크로 목표(g) — 일일 칼로리 목표에서 파생 계산 (design D3).
 * 탄 50% / 단 30% / 지 20% (kcal 기준) 비율을 g으로 환산(탄·단 4kcal/g, 지 9kcal/g, HALF_UP 반올림).
 * 아직 사용자가 조정할 수 없는 파생값이라 저장하지 않고 조회 시점에 계산한다.
 * 적응형 TDEE change에서 개인화 목표로 대체될 기준값.
 */
public record MacroTargetG(Integer carbG, Integer proteinG, Integer fatG) {

    private static final BigDecimal CARB_RATIO = new BigDecimal("0.5");
    private static final BigDecimal PROTEIN_RATIO = new BigDecimal("0.3");
    private static final BigDecimal FAT_RATIO = new BigDecimal("0.2");

    /** 칼로리 목표(null이면 모든 값 null)로부터 탄단지 목표 g을 계산한다 */
    public static MacroTargetG from(Integer kcalTarget) {
        if (kcalTarget == null) {
            return new MacroTargetG(null, null, null);
        }
        return new MacroTargetG(
                grams(kcalTarget, CARB_RATIO, MacroKcal.CARB),
                grams(kcalTarget, PROTEIN_RATIO, MacroKcal.PROTEIN),
                grams(kcalTarget, FAT_RATIO, MacroKcal.FAT));
    }

    private static int grams(int kcalTarget, BigDecimal ratio, int kcalPerGram) {
        return BigDecimal.valueOf(kcalTarget)
                .multiply(ratio)
                .divide(BigDecimal.valueOf(kcalPerGram), 0, RoundingMode.HALF_UP)
                .intValueExact();
    }
}
