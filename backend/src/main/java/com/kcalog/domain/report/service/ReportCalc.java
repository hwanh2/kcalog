package com.kcalog.domain.report.service;

import com.kcalog.domain.meal.dto.MacroKcal;
import com.kcalog.domain.report.dto.Period;
import com.kcalog.domain.report.dto.ReportResponse.Insight;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * 기간 리포트 순수 계산 — 달성 판정·칼로리 비율·연속 초과·기간별 인사이트 랭킹. Spring 비의존, TDD.
 * <p>
 * 달성 판정({@link #onTarget})만 공개한다. 칭찬(coaching)이 같은 기준을 써야 하기 때문이다.
 * 판정을 두 벌 두면 리포트에서는 달성인데 칭찬은 오지 않는 날이 온다.
 */
public final class ReportCalc {

    /** 목표 근접 밴드(유지·증량) */
    static final double ON_TARGET_BAND = 0.10;
    /** 연속 초과·미달을 신호로 볼 최소 일수(스케일 무관) */
    static final int STREAK_THRESHOLD = 3;

    /** 하루가 목표를 지켰나 — 감량 목표면 섭취가 목표 이하, 그 외엔 목표 ±10% 밴드 안 */
    public static boolean onTarget(int kcal, int target, boolean cut) {
        return cut ? kcal <= target : Math.abs(kcal - target) <= target * ON_TARGET_BAND;
    }

    /** 달성일 수 */
    static int onTargetDays(List<Integer> dailyKcal, int target, boolean cut) {
        int count = 0;
        for (int k : dailyKcal) {
            if (onTarget(k, target, cut)) {
                count++;
            }
        }
        return count;
    }

    /** 칼로리 비율(%) — 탄4·단4·지9 환산. 합 100·음수 없음(largest-remainder). 총량 0이면 모두 0 */
    static int[] percent(double carbG, double proteinG, double fatG) {
        double ck = carbG * MacroKcal.CARB, pk = proteinG * MacroKcal.PROTEIN, fk = fatG * MacroKcal.FAT;
        double total = ck + pk + fk;
        if (total <= 0) {
            return new int[] {0, 0, 0};
        }
        return largestRemainder(new double[] {ck / total * 100, pk / total * 100, fk / total * 100});
    }

    /** 각 값을 내림한 뒤 남는 몫을 소수부가 큰 순서로 1씩 배분 — 합 100 보장, 음수 없음 */
    private static int[] largestRemainder(double[] raw) {
        int[] floor = new int[raw.length];
        double[] rem = new double[raw.length];
        int sum = 0;
        for (int i = 0; i < raw.length; i++) {
            floor[i] = (int) Math.floor(raw[i]);
            rem[i] = raw[i] - floor[i];
            sum += floor[i];
        }
        Integer[] order = {0, 1, 2};
        java.util.Arrays.sort(order, Comparator.comparingDouble((Integer i) -> rem[i]).reversed());
        for (int k = 0; k < 100 - sum && k < order.length; k++) {
            floor[order[k]]++;
        }
        return floor;
    }

    /** 날짜 순 플래그(미기록일 포함, 미기록=false)의 최대 연속 true 길이 */
    static int maxStreak(List<Boolean> flags) {
        int max = 0, cur = 0;
        for (boolean b : flags) {
            cur = b ? cur + 1 : 0;
            max = Math.max(max, cur);
        }
        return max;
    }

    /** 계산된 신호 → 심각도 랭킹 상위 3개. 기간(period)에 맞춰 문구·임계값을 스케일 */
    static List<Insight> insights(Signals s, Period period) {
        String scope = switch (period) {
            case WEEK -> "이번 주";
            case MONTH -> "이번 달";
            case TOTAL -> "전체 기간";
        };
        int countTrigger = Math.max(STREAK_THRESHOLD, (int) Math.ceil(s.daysLogged() * 0.4)); // 기간 비례

        List<Scored> c = new ArrayList<>();
        if (s.fatOverStreak() >= STREAK_THRESHOLD) {
            c.add(new Scored(90, "fat-streak", "지방을 %d일 연속 목표보다 많이 먹었어요.".formatted(s.fatOverStreak())));
        }
        if (s.proteinDeficitDays() >= countTrigger) {
            c.add(new Scored(85, "protein-low", "단백질이 %d일 목표에 못 미쳤어요.".formatted(s.proteinDeficitDays())));
        }
        if (s.carbOverStreak() >= STREAK_THRESHOLD) {
            c.add(new Scored(80, "carb-streak", "탄수화물을 %d일 연속 목표보다 많이 먹었어요.".formatted(s.carbOverStreak())));
        }
        if (s.overTargetDays() >= countTrigger) {
            c.add(new Scored(75, "over-target", "칼로리 목표를 %d일 초과했어요.".formatted(s.overTargetDays())));
        }
        if (s.cut() && s.avgKcal() != null && s.maintenanceKcal() != null && s.avgKcal() > s.maintenanceKcal()) {
            c.add(new Scored(70, "surplus",
                    "감량 목표인데 평균 섭취가 유지칼로리보다 %dkcal 많아요.".formatted(s.avgKcal() - s.maintenanceKcal())));
        }
        if (s.daysLogged() < s.rangeDays() * 0.5) {
            c.add(new Scored(65, "low-adherence",
                    "%s 기록이 %d일뿐이에요. 꾸준히 기록하면 분석이 정확해져요.".formatted(scope, s.daysLogged())));
        }
        // 긍정 — 달성 비율 70% 이상
        if (s.onTargetDays() != null && s.daysLogged() >= 3 && s.onTargetDays() >= s.daysLogged() * 0.7) {
            c.add(new Scored(30, "on-track", "%s %d일 목표를 지켰어요. 잘하고 있어요!".formatted(scope, s.onTargetDays())));
        }
        if (c.isEmpty() && s.daysLogged() >= 4) {
            c.add(new Scored(20, "steady", "%s 꾸준히 기록했어요. 좋은 흐름이에요.".formatted(scope)));
        }
        return c.stream()
                .sorted(Comparator.comparingInt(Scored::severity).reversed())
                .limit(3)
                .map(x -> new Insight(x.code(), x.message()))
                .toList();
    }

    /** 인사이트 신호 묶음 — rangeDays: 기간 전체 일수(성실도 스케일용) */
    record Signals(int daysLogged, int rangeDays, Integer onTargetDays, int overTargetDays,
                   int proteinDeficitDays, int fatOverStreak, int carbOverStreak,
                   Integer avgKcal, Integer maintenanceKcal, boolean cut) {
    }

    private record Scored(int severity, String code, String message) {
    }

    private ReportCalc() {
    }
}
