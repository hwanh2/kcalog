package com.kcalog.domain.dashboard.service;

import com.kcalog.domain.meal.dto.MacroKcal;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * 매크로 목표(g). 일일 칼로리 목표, 체중, 근육량 목표 여부에서 파생 계산 (design D1).
 *
 * <p>비율은 근육량이 목표면 탄 45 / 단 30 / 지 25, 아니면 탄 55 / 단 20 / 지 25다.
 * 단백질은 비율로 구한 뒤 <b>체중당 1.2~2.0g으로 자른다</b>. 비율만 쓰면 칼로리가 큰 회원은
 * 2.8 g/kg까지 부풀고 감량 회원은 근손실을 막는 선 아래로 떨어진다(D2).
 *
 * <p>계산 순서가 곧 우선순위다: <b>단백질(체중) → 지방(비율) → 탄수(나머지)</b>.
 * 잘려서 남거나 모자란 칼로리는 전부 탄수화물이 흡수한다. 지방은 이미 하한 근처라
 * 더 깎으면 25%로 올린 의미가 없어진다(D6).
 *
 * <p>아직 사용자가 직접 조정할 수 없는 파생값이라 저장하지 않고 조회 시점에 계산한다.
 */
public record MacroTargetG(Integer carbG, Integer proteinG, Integer fatG) {

    private static final BigDecimal PROTEIN_RATIO = new BigDecimal("0.20");
    private static final BigDecimal PROTEIN_RATIO_MUSCLE = new BigDecimal("0.30");
    /** 근육량 목표 여부와 무관하게 같다. 켰더니 지방이 줄어드는 역전을 막는다 (D5) */
    private static final BigDecimal FAT_RATIO = new BigDecimal("0.25");

    /*
     * 이 세 값은 온보딩 결과 화면의 안내 문구가 그대로 인용한다
     * (OnboardingPage의 "1kg당 1.2~2.0g", "지방은 25%"). 여기를 고치면 그 문구도 함께 고친다.
     * 화면의 g 표시는 응답값에서 역산하므로 드리프트가 없지만, 산문은 이 상수를 복제한다.
     */
    private static final BigDecimal PROTEIN_MIN_PER_KG = new BigDecimal("1.2");
    private static final BigDecimal PROTEIN_MAX_PER_KG = new BigDecimal("2.0");

    /**
     * @param kcalTarget       일일 칼로리 목표. null이면 세 값 모두 null
     * @param weightKg         최근 체중. null이면 범위 제한 없이 비율만 쓴다 (D7)
     * @param muscleGoal 근육량 목표 여부. 단백질 비율을 가른다
     */
    public static MacroTargetG from(Integer kcalTarget, BigDecimal weightKg, boolean muscleGoal) {
        if (kcalTarget == null) {
            return new MacroTargetG(null, null, null);
        }
        BigDecimal kcal = BigDecimal.valueOf(kcalTarget);

        BigDecimal proteinRatio = muscleGoal ? PROTEIN_RATIO_MUSCLE : PROTEIN_RATIO;
        int proteinG = grams(clampProtein(kcal.multiply(proteinRatio)
                .divide(BigDecimal.valueOf(MacroKcal.PROTEIN), 4, RoundingMode.HALF_UP), weightKg));
        int fatG = grams(kcal.multiply(FAT_RATIO)
                .divide(BigDecimal.valueOf(MacroKcal.FAT), 4, RoundingMode.HALF_UP));

        // 반올림한 g에서 역산해야 화면에 보이는 세 값의 합이 목표와 맞는다 (D11)
        int spent = proteinG * MacroKcal.PROTEIN + fatG * MacroKcal.FAT;
        int carbG = grams(BigDecimal.valueOf(kcalTarget - spent)
                .divide(BigDecimal.valueOf(MacroKcal.CARB), 4, RoundingMode.HALF_UP));

        /*
         * 탄수만 0으로 막는다. 단백질 하한(체중x1.2)과 지방(25%)의 합이 목표를 넘으면
         * 세 값의 합도 목표를 넘는데, 그 임계는 체중 > 목표kcal x 0.156이다.
         * 1400kcal에서 219kg 이상이라 온보딩 범위(체중 250kg, 목표 하한 1200kcal)로는
         * 닿지 않는다. 목표를 손으로 아주 낮게 고친 극단 조합에서만 성립하므로
         * 단백질을 예산 안으로 다시 깎지 않는다. 깎으면 근손실을 막는 하한이 무너진다.
         */
        return new MacroTargetG(Math.max(0, carbG), proteinG, fatG);
    }

    /** 체중을 모르면 자를 기준이 없다. 비율값을 그대로 둔다 */
    private static BigDecimal clampProtein(BigDecimal ratioGrams, BigDecimal weightKg) {
        if (weightKg == null) {
            return ratioGrams;
        }
        return ratioGrams
                .max(weightKg.multiply(PROTEIN_MIN_PER_KG))
                .min(weightKg.multiply(PROTEIN_MAX_PER_KG));
    }

    private static int grams(BigDecimal value) {
        return value.setScale(0, RoundingMode.HALF_UP).intValueExact();
    }
}
