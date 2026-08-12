package com.kcalog.domain.member.dto;

import com.kcalog.domain.dashboard.service.MacroTargetG;

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
    public static KcalSuggestionResponse of(double maintenance, int dailyKcalTarget) {
        MacroTargetG macro = MacroTargetG.from(dailyKcalTarget);
        return new KcalSuggestionResponse((int) Math.round(maintenance), dailyKcalTarget,
                macro.carbG(), macro.proteinG(), macro.fatG());
    }
}
