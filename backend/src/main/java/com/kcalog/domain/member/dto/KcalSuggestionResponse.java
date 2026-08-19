package com.kcalog.domain.member.dto;

import com.kcalog.domain.dashboard.service.MacroTargetG;

import java.math.BigDecimal;

/**
 * 제안 칼로리 — 계산 근거(유지칼로리)와 목표, 목표 기준 탄단지(g)를 함께 준다.
 * 온보딩 완료 화면이 "왜 이 목표인지"를 보여줄 수 있게 하기 위함(design D4).
 */
public record KcalSuggestionResponse(
        int maintenanceKcal,
        int dailyKcalTarget,
        int carbTargetG,
        int proteinTargetG,
        int fatTargetG
) {
    /**
     * 체중·근육량 목표 여부를 함께 받는다 — 대시보드가 보여줄 값과 어긋나면
     * 온보딩 마지막 화면에서 본 숫자가 거짓말이 된다.
     */
    public static KcalSuggestionResponse of(double maintenance, int dailyKcalTarget,
                                            BigDecimal weightKg, boolean muscleGoal) {
        MacroTargetG macro = MacroTargetG.from(dailyKcalTarget, weightKg, muscleGoal);
        return new KcalSuggestionResponse((int) Math.round(maintenance), dailyKcalTarget,
                macro.carbG(), macro.proteinG(), macro.fatG());
    }
}
