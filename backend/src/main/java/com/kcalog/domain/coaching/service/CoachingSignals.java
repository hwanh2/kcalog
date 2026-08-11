package com.kcalog.domain.coaching.service;

import java.time.LocalDate;
import java.util.List;

/**
 * 코칭 LLM에 주입할 구조화 신호 — 숫자는 전부 규칙이 계산해 여기 담고, LLM은 서술만 한다(하이브리드).
 * 기존 서비스(리포트·TDEE·체중 추세) 결과를 모은 스냅샷. 신호에 없는 수치를 LLM이 지어내지 않게 하는 근거.
 */
public record CoachingSignals(
        LocalDate date,
        Integer targetKcal,          // 회원 일일 목표(없으면 null)
        boolean cut,                 // 감량 목표 방향
        Integer todayKcal,           // 오늘 섭취(없으면 null)
        Double todayCarbG,
        Double todayProteinG,
        Double todayFatG,
        int weekDaysLogged,          // 최근 7일 기록일
        Integer weekAvgKcal,
        Integer weekOnTargetDays,
        Integer carbPct,             // 주간 칼로리 비율
        Integer proteinPct,
        Integer fatPct,
        Integer maintenanceKcal,     // 유지칼로리(실측/공식)
        String tdeeSource,           // ADAPTIVE | FORMULA | null
        Integer recommendedTargetKcal,
        Double weightLossKg7d,       // 최근 7일 추세 체중 변화(음수=감량), 부족 시 null
        int weightStreakDays,        // 체중 기록 연속일
        Double latestWeightKg,
        List<String> ruleInsights    // 규칙 인사이트 문구(폴백·근거)
) {

    /** 코칭을 낼 최소 데이터가 있는지 — 최근 기록 또는 오늘 섭취가 있으면 생성 */
    public boolean enoughData() {
        return weekDaysLogged >= 1 || todayKcal != null;
    }

    /** 목표 달성률(%) — 목표·기록 없으면 null */
    public Integer adherencePct() {
        if (weekOnTargetDays == null || weekDaysLogged == 0) {
            return null;
        }
        return (int) Math.round(weekOnTargetDays * 100.0 / weekDaysLogged);
    }
}
