package com.kcalog.domain.report.service;

import com.kcalog.domain.report.dto.ReportResponse.Insight;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/** 주간 리포트 순수 계산 — 달성 판정·칼로리 비율·연속 초과·인사이트 랭킹(design D2/D3/D5). Spring 비의존, TDD. */
final class WeeklyReportCalc {

    /** 목표 근접 밴드(유지·증량) */
    static final double ON_TARGET_BAND = 0.10;
    /** 연속 초과·미달을 신호로 볼 최소 일수 */
    static final int STREAK_THRESHOLD = 3;

    /** 달성일 수 — 감량 목표면 섭취 ≤ 목표, 그 외엔 목표 ±10% 밴드 안 */
    static int onTargetDays(List<Integer> dailyKcal, int target, boolean cut) {
        int count = 0;
        for (int k : dailyKcal) {
            if (cut ? k <= target : Math.abs(k - target) <= target * ON_TARGET_BAND) {
                count++;
            }
        }
        return count;
    }

    /** 칼로리 비율(%) — 탄4·단4·지9 환산, 합 100 보정. 총량 0이면 모두 0 */
    static int[] percent(double carbG, double proteinG, double fatG) {
        double ck = carbG * 4, pk = proteinG * 4, fk = fatG * 9;
        double total = ck + pk + fk;
        if (total <= 0) {
            return new int[] {0, 0, 0};
        }
        int cp = (int) Math.round(ck / total * 100);
        int pp = (int) Math.round(pk / total * 100);
        return new int[] {cp, pp, 100 - cp - pp};
    }

    /** 날짜 순 플래그의 최대 연속 true 길이 */
    static int maxStreak(List<Boolean> flags) {
        int max = 0, cur = 0;
        for (boolean b : flags) {
            cur = b ? cur + 1 : 0;
            max = Math.max(max, cur);
        }
        return max;
    }

    /** 계산된 신호 → 심각도 랭킹 상위 3개 인사이트. 부정 신호 우선, 없으면 긍정 하나. */
    static List<Insight> insights(Signals s) {
        List<Scored> c = new ArrayList<>();
        if (s.fatOverStreak() >= STREAK_THRESHOLD) {
            c.add(new Scored(90, "fat-streak", "지방을 %d일 연속 목표보다 많이 먹었어요.".formatted(s.fatOverStreak())));
        }
        if (s.proteinDeficitDays() >= STREAK_THRESHOLD) {
            c.add(new Scored(85, "protein-low", "단백질이 %d일 목표에 못 미쳤어요.".formatted(s.proteinDeficitDays())));
        }
        if (s.carbOverStreak() >= STREAK_THRESHOLD) {
            c.add(new Scored(80, "carb-streak", "탄수화물을 %d일 연속 목표보다 많이 먹었어요.".formatted(s.carbOverStreak())));
        }
        if (s.overTargetDays() >= STREAK_THRESHOLD) {
            c.add(new Scored(75, "over-target", "칼로리 목표를 %d일 초과했어요.".formatted(s.overTargetDays())));
        }
        if (s.cut() && s.avgKcal() != null && s.maintenanceKcal() != null && s.avgKcal() > s.maintenanceKcal()) {
            c.add(new Scored(70, "surplus",
                    "감량 목표인데 평균 섭취가 유지칼로리보다 %dkcal 많아요.".formatted(s.avgKcal() - s.maintenanceKcal())));
        }
        if (s.daysLogged() <= STREAK_THRESHOLD) {
            c.add(new Scored(65, "low-adherence",
                    "이번 주 기록이 %d일뿐이에요. 꾸준히 기록하면 분석이 정확해져요.".formatted(s.daysLogged())));
        }
        // 긍정(부정보다 낮은 우선순위)
        if (s.onTargetDays() != null && s.onTargetDays() >= 5) {
            c.add(new Scored(30, "on-track", "이번 주 %d일 목표를 지켰어요. 잘하고 있어요!".formatted(s.onTargetDays())));
        }
        if (c.isEmpty() && s.daysLogged() >= 4) {
            c.add(new Scored(20, "steady", "이번 주 꾸준히 기록했어요. 좋은 흐름이에요."));
        }
        return c.stream()
                .sorted(Comparator.comparingInt(Scored::severity).reversed())
                .limit(3)
                .map(x -> new Insight(x.code(), x.message()))
                .toList();
    }

    /** 인사이트 신호 묶음 */
    record Signals(int daysLogged, Integer onTargetDays, int overTargetDays,
                   int proteinDeficitDays, int fatOverStreak, int carbOverStreak,
                   Integer avgKcal, Integer maintenanceKcal, boolean cut) {
    }

    private record Scored(int severity, String code, String message) {
    }

    private WeeklyReportCalc() {
    }
}
