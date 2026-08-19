package com.kcalog.domain.coaching.service;

import com.kcalog.domain.coaching.entity.PraiseKind;
import com.kcalog.domain.report.service.ReportCalc;
import com.kcalog.domain.weight.service.WeightStats;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * 칭찬 판정. 신호를 받아 칭찬거리를 낸다. Spring 비의존 순수 함수라 스펙 시나리오로 TDD한다.
 * <p>
 * 판정만 하고 문구는 쓰지 않는다(그건 LLM 몫). 다만 생성이 실패해도 할 말이 있어야 하므로
 * 폴백 문구는 여기서 함께 만든다(design D3).
 */
public final class PraiseRules {

    /** 연속 기록 이정표. 단계마다 평생 한 번이라 촘촘히 뒀다(design D5) */
    static final int[] STREAK_MILESTONES = {3, 7, 14, 30, 60, 100};

    public static List<PraiseCandidate> detect(PraiseSignals signals) {
        List<PraiseCandidate> found = new ArrayList<>();
        firstStep(signals, found);
        mealStreak(signals, found);
        weightTrend(signals, found);
        dailyGoal(signals, found);
        return found.stream()
                .sorted(Comparator.comparingInt(candidate -> candidate.kind().getPriority()))
                .toList();
    }

    /**
     * 첫 기록. 데이터가 거의 없는 초반 회원에게 유일하게 닿는 칭찬이다.
     * 브리핑조차 이 시기에는 "데이터 부족"으로 떨어진다.
     */
    private static void firstStep(PraiseSignals s, List<PraiseCandidate> found) {
        if (s.hasAnyMeal()) {
            found.add(new PraiseCandidate(PraiseKind.FIRST_MEAL, "first:meal",
                    "첫 식사 기록을 남겼다", "첫 기록이에요. 잘 오셨어요"));
        }
        if (s.hasAnyWeight()) {
            found.add(new PraiseCandidate(PraiseKind.FIRST_WEIGHT, "first:weight",
                    "첫 체중 기록을 남겼다", "첫 체중 기록이에요. 시작이 좋아요"));
        }
    }

    /**
     * 연속 기록. 도달한 이정표 중 <b>가장 큰 것 하나만</b> 낸다.
     * 여드레 연속인 신규 회원에게 3일과 7일을 몰아주면 말풍선이 줄줄이 뜬다.
     */
    private static void mealStreak(PraiseSignals s, List<PraiseCandidate> found) {
        List<LocalDate> days = s.mealDays();
        if (days.isEmpty() || !isCurrent(days.getLast(), s.judgedDay())) {
            return;
        }
        int streak = WeightStats.streak(days);
        int milestone = 0;
        for (int m : STREAK_MILESTONES) {
            if (streak >= m) {
                milestone = m;
            }
        }
        if (milestone == 0) {
            return;
        }
        found.add(new PraiseCandidate(PraiseKind.MEAL_STREAK, "meal-streak:" + milestone,
                "식사 기록 %d일 연속".formatted(milestone),
                "%d일 연속이에요. 잘하고 있어요".formatted(milestone)));
    }

    /**
     * 마지막 기록이 오늘이나 판정일(어제)에 닿아 있는지.
     * 없으면 한참 전에 끊긴 연속으로 칭찬하게 된다.
     */
    private static boolean isCurrent(LocalDate lastDay, LocalDate judgedDay) {
        return !lastDay.isBefore(judgedDay);
    }

    /** 체중 추세 하락. 감량이 목표인 회원에게만. 유지·증량이 목표면 칭찬이 아니다(design D10) */
    private static void weightTrend(PraiseSignals s, List<PraiseCandidate> found) {
        if (!s.cut() || s.weightTrend7d() == null || s.weightTrend7d() >= 0) {
            return;
        }
        double dropped = Math.abs(s.weightTrend7d());
        found.add(new PraiseCandidate(PraiseKind.WEIGHT_TREND, "weight-trend:" + s.isoWeek(),
                "최근 7일 추세 체중이 %.1fkg 내려갔다".formatted(dropped),
                "추세가 내려갔어요. 잘 가고 있어요"));
    }

    /**
     * 하루 목표 달성. 판정 기준은 리포트와 공유한다({@link ReportCalc#onTarget}).
     * 두 곳의 기준이 다르면 리포트에서는 달성인데 칭찬은 오지 않는 날이 온다(design D9).
     */
    private static void dailyGoal(PraiseSignals s, List<PraiseCandidate> found) {
        if (s.judgedDayKcal() == null || s.dailyKcalTarget() == null) {
            return;
        }
        if (!ReportCalc.onTarget(s.judgedDayKcal(), s.dailyKcalTarget(), s.cut())) {
            return;
        }
        found.add(new PraiseCandidate(PraiseKind.DAILY_GOAL, "daily-goal:" + s.judgedDay(),
                "%s 섭취 %,dkcal로 목표 %,dkcal를 지켰다"
                        .formatted(s.judgedDay(), s.judgedDayKcal(), s.dailyKcalTarget()),
                "어제 목표 안에서 마무리했어요"));
    }

    private PraiseRules() {
    }
}
