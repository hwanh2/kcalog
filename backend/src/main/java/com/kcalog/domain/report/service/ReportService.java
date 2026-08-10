package com.kcalog.domain.report.service;

import com.kcalog.domain.dashboard.service.MacroTargetG;
import com.kcalog.domain.meal.service.MealDailyIntake;
import com.kcalog.domain.meal.service.MealDailyIntake.DailyNutrition;
import com.kcalog.domain.member.entity.Member;
import com.kcalog.domain.member.repository.MemberRepository;
import com.kcalog.domain.report.dto.Period;
import com.kcalog.domain.report.dto.ReportResponse;
import com.kcalog.domain.report.dto.ReportResponse.Bucket;
import com.kcalog.domain.report.dto.ReportResponse.Insight;
import com.kcalog.domain.report.dto.ReportResponse.TdeePoint;
import com.kcalog.domain.report.service.ReportCalc.Signals;
import com.kcalog.domain.tdee.dto.TdeeResponse;
import com.kcalog.domain.tdee.service.TdeeService;
import com.kcalog.domain.weight.entity.WeightLog;
import com.kcalog.domain.weight.repository.WeightLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Objects;

/** 기간 리포트 — 주간/월간/총을 버킷으로 엮어 달성·분포·TDEE·인사이트를 조립. 조회 시 계산. */
@Service
@RequiredArgsConstructor
public class ReportService {

    private static final String[] WEEKDAY = {"월", "화", "수", "목", "금", "토", "일"};

    private final MemberRepository memberRepository;
    private final MealDailyIntake mealDailyIntake;
    private final WeightLogRepository weightLogRepository;
    private final TdeeService tdeeService;
    private final Clock clock;

    @Transactional(readOnly = true)
    public ReportResponse get(Long memberId, Period period, LocalDate anchor) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new NoSuchElementException("회원을 찾을 수 없습니다"));
        ZoneId zone = clock.getZone();
        LocalDate today = LocalDate.now(clock);
        LocalDate a = anchor != null ? anchor : today;

        Range range = resolveRange(period, a, memberId, zone);
        int rangeDays = (int) ChronoUnit.DAYS.between(range.start(), range.end()) + 1;
        Integer target = member.getDailyKcalTarget();
        MacroTargetG macro = MacroTargetG.from(target);

        Map<LocalDate, DailyNutrition> byDate = mealDailyIntake.byDate(memberId, range.start(), range.end(), zone);
        List<DailyNutrition> days = new ArrayList<>(byDate.values());
        int daysLogged = days.size();

        Integer avgKcal = daysLogged == 0 ? null
                : (int) Math.round(days.stream().mapToInt(DailyNutrition::kcal).average().orElse(0));
        BigDecimal avgCarb = mean(days, DailyNutrition::carbG, daysLogged);
        BigDecimal avgProtein = mean(days, DailyNutrition::proteinG, daysLogged);
        BigDecimal avgFat = mean(days, DailyNutrition::fatG, daysLogged);
        int[] pct = ReportCalc.percent(avgCarb.doubleValue(), avgProtein.doubleValue(), avgFat.doubleValue());

        WeightLog latest = weightLogRepository.findTopByMemberIdOrderByLogDateDesc(memberId).orElse(null);
        boolean cut = latest != null && member.getTargetWeightKg() != null
                && member.getTargetWeightKg().compareTo(latest.getWeightKg()) < 0;
        Integer onTargetDays = (target != null && daysLogged > 0)
                ? ReportCalc.onTargetDays(days.stream().map(DailyNutrition::kcal).toList(), target, cut) : null;

        List<Bucket> buckets = buildBuckets(period, range, byDate);
        List<TdeePoint> series = tdeeSeries(memberId, period, buckets, today);
        Integer lastMaintenance = series.stream().map(TdeePoint::maintenanceKcal)
                .filter(Objects::nonNull).reduce((x, y) -> y).orElse(null);

        List<Insight> insights = daysLogged == 0 ? List.of()
                : ReportCalc.insights(
                        signals(range, rangeDays, byDate, macro, target, avgKcal, lastMaintenance, cut, onTargetDays),
                        period);

        return new ReportResponse(period, range.start(), range.end(), daysLogged, avgKcal, target, onTargetDays,
                avgCarb, avgProtein, avgFat, pct[0], pct[1], pct[2],
                macro.carbG(), macro.proteinG(), macro.fatG(), buckets, series, insights);
    }

    // --- 기간·버킷 ---

    private Range resolveRange(Period period, LocalDate anchor, Long memberId, ZoneId zone) {
        return switch (period) {
            case WEEK -> {
                LocalDate ws = anchor.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
                yield new Range(ws, ws.plusDays(6));
            }
            case MONTH -> {
                LocalDate ms = anchor.withDayOfMonth(1);
                yield new Range(ms, ms.with(TemporalAdjusters.lastDayOfMonth()));
            }
            case TOTAL -> {
                LocalDate first = mealDailyIntake.earliestDate(memberId, zone);
                LocalDate today = LocalDate.now(clock);
                yield new Range(first != null ? first.withDayOfMonth(1) : today.withDayOfMonth(1), today);
            }
        };
    }

    /** 버킷: 주간=요일별(7), 월간=일별, 총=월별. 각 버킷 값은 그 구간 기록일의 일 평균 */
    private List<Bucket> buildBuckets(Period period, Range range, Map<LocalDate, DailyNutrition> byDate) {
        List<Bucket> buckets = new ArrayList<>();
        if (period == Period.TOTAL) {
            LocalDate m = range.start().withDayOfMonth(1);
            while (!m.isAfter(range.end())) {
                buckets.add(bucketOf(m.getMonthValue() + "월", m, byDate, m, m.with(TemporalAdjusters.lastDayOfMonth())));
                m = m.plusMonths(1);
            }
        } else {
            for (LocalDate d = range.start(); !d.isAfter(range.end()); d = d.plusDays(1)) {
                String label = period == Period.WEEK
                        ? WEEKDAY[d.getDayOfWeek().getValue() - 1]
                        : String.valueOf(d.getDayOfMonth());
                buckets.add(bucketOf(label, d, byDate, d, d));
            }
        }
        return buckets;
    }

    private Bucket bucketOf(String label, LocalDate start, Map<LocalDate, DailyNutrition> byDate,
                            LocalDate from, LocalDate to) {
        List<DailyNutrition> in = byDate.entrySet().stream()
                .filter(e -> !e.getKey().isBefore(from) && !e.getKey().isAfter(to))
                .map(Map.Entry::getValue).toList();
        int n = in.size();
        if (n == 0) {
            return new Bucket(label, start, 0, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);
        }
        int kcal = (int) Math.round(in.stream().mapToInt(DailyNutrition::kcal).average().orElse(0));
        return new Bucket(label, start, kcal,
                mean(in, DailyNutrition::carbG, n), mean(in, DailyNutrition::proteinG, n), mean(in, DailyNutrition::fatG, n));
    }

    /** TDEE 시리즈 — 버킷별 대표일(오늘 이하) 기준 */
    private List<TdeePoint> tdeeSeries(Long memberId, Period period, List<Bucket> buckets, LocalDate today) {
        List<TdeePoint> series = new ArrayList<>();
        for (Bucket b : buckets) {
            if (b.startDate().isAfter(today)) {
                continue;
            }
            LocalDate asOf = period == Period.TOTAL
                    ? b.startDate().with(TemporalAdjusters.lastDayOfMonth()) : b.startDate();
            if (asOf.isAfter(today)) {
                asOf = today;
            }
            TdeeResponse t = tdeeService.get(memberId, asOf);
            series.add(new TdeePoint(b.label(), b.startDate(), t.maintenanceKcal(), t.source()));
        }
        return series;
    }

    // --- 신호 (달력일 기준 연속) ---

    private Signals signals(Range range, int rangeDays, Map<LocalDate, DailyNutrition> byDate, MacroTargetG macro,
                            Integer target, Integer avgKcal, Integer maintenance, boolean cut, Integer onTargetDays) {
        int daysLogged = byDate.size();
        int overTargetDays = target != null
                ? (int) byDate.values().stream().filter(d -> d.kcal() > target).count() : 0;
        int proteinDeficitDays = macro.proteinG() != null
                ? (int) byDate.values().stream().filter(d -> d.proteinG().doubleValue() < macro.proteinG()).count() : 0;
        // 연속 초과는 미기록일을 false로 채운 달력일 시퀀스로 판정(간극 무시 방지)
        int fatStreak = macro.fatG() != null
                ? ReportCalc.maxStreak(calendarFlags(range, byDate, d -> d.fatG().doubleValue() > macro.fatG())) : 0;
        int carbStreak = macro.carbG() != null
                ? ReportCalc.maxStreak(calendarFlags(range, byDate, d -> d.carbG().doubleValue() > macro.carbG())) : 0;
        return new Signals(daysLogged, rangeDays, onTargetDays, overTargetDays, proteinDeficitDays,
                fatStreak, carbStreak, avgKcal, maintenance, cut);
    }

    /** range의 각 달력일에 대해 조건 플래그(미기록일=false) */
    private List<Boolean> calendarFlags(Range range, Map<LocalDate, DailyNutrition> byDate,
                                        java.util.function.Predicate<DailyNutrition> over) {
        List<Boolean> flags = new ArrayList<>();
        for (LocalDate d = range.start(); !d.isAfter(range.end()); d = d.plusDays(1)) {
            DailyNutrition n = byDate.get(d);
            flags.add(n != null && over.test(n));
        }
        return flags;
    }

    private BigDecimal mean(List<DailyNutrition> days, java.util.function.Function<DailyNutrition, BigDecimal> field, int n) {
        if (n == 0) {
            return BigDecimal.ZERO;
        }
        return days.stream().map(field).reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(n), 1, RoundingMode.HALF_UP);
    }

    private record Range(LocalDate start, LocalDate end) {
    }
}
