package com.kcalog.domain.report.service;

import com.kcalog.domain.dashboard.service.MacroTargetG;
import com.kcalog.domain.meal.entity.Meal;
import com.kcalog.domain.meal.repository.MealRepository;
import com.kcalog.domain.member.entity.Member;
import com.kcalog.domain.member.repository.MemberRepository;
import com.kcalog.domain.report.dto.Period;
import com.kcalog.domain.report.dto.ReportResponse;
import com.kcalog.domain.report.dto.ReportResponse.Bucket;
import com.kcalog.domain.report.dto.ReportResponse.Insight;
import com.kcalog.domain.report.dto.ReportResponse.TdeePoint;
import com.kcalog.domain.report.service.WeeklyReportCalc.Signals;
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
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Objects;
import java.util.TreeMap;

/** 기간 리포트 — 주간/월간/총을 버킷으로 엮어 달성·분포·TDEE·인사이트를 조립(design + 사용자 요청). 조회 시 계산. */
@Service
@RequiredArgsConstructor
public class ReportService {

    private static final String[] WEEKDAY = {"월", "화", "수", "목", "금", "토", "일"};

    private final MemberRepository memberRepository;
    private final MealRepository mealRepository;
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
        Integer target = member.getDailyKcalTarget();
        MacroTargetG macro = MacroTargetG.from(target);

        Map<LocalDate, DayTotals> byDate = dailyTotals(memberId, range.start(), range.end(), zone);
        List<DayTotals> days = new ArrayList<>(byDate.values());
        int daysLogged = days.size();

        Integer avgKcal = daysLogged == 0 ? null
                : (int) Math.round(days.stream().mapToInt(DayTotals::kcal).average().orElse(0));
        BigDecimal avgCarb = mean(days, DayTotals::carb, daysLogged);
        BigDecimal avgProtein = mean(days, DayTotals::protein, daysLogged);
        BigDecimal avgFat = mean(days, DayTotals::fat, daysLogged);
        int[] pct = WeeklyReportCalc.percent(avgCarb.doubleValue(), avgProtein.doubleValue(), avgFat.doubleValue());

        WeightLog latest = weightLogRepository.findTopByMemberIdOrderByLogDateDesc(memberId).orElse(null);
        boolean cut = latest != null && member.getTargetWeightKg() != null
                && member.getTargetWeightKg().compareTo(latest.getWeightKg()) < 0;
        Integer onTargetDays = (target != null && daysLogged > 0)
                ? WeeklyReportCalc.onTargetDays(days.stream().map(DayTotals::kcal).toList(), target, cut) : null;

        List<Bucket> buckets = buildBuckets(period, range, byDate);
        List<TdeePoint> series = tdeeSeries(memberId, period, buckets, today);
        Integer lastMaintenance = series.stream().map(TdeePoint::maintenanceKcal)
                .filter(Objects::nonNull).reduce((x, y) -> y).orElse(null);

        List<Insight> insights = daysLogged == 0 ? List.of()
                : WeeklyReportCalc.insights(signals(days, macro, target, avgKcal, lastMaintenance, cut, onTargetDays));

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
                LocalDate first = earliestLogDate(memberId, zone);
                LocalDate today = LocalDate.now(clock);
                yield new Range(first != null ? first.withDayOfMonth(1) : today.withDayOfMonth(1), today);
            }
        };
    }

    /** 버킷: 주간=요일별(7), 월간=일별, 총=월별. 각 버킷 값은 그 구간 기록일의 일 평균 */
    private List<Bucket> buildBuckets(Period period, Range range, Map<LocalDate, DayTotals> byDate) {
        List<Bucket> buckets = new ArrayList<>();
        if (period == Period.TOTAL) {
            LocalDate m = range.start().withDayOfMonth(1);
            while (!m.isAfter(range.end())) {
                LocalDate monthEnd = m.with(TemporalAdjusters.lastDayOfMonth());
                buckets.add(bucketOf(m.getMonthValue() + "월", m, byDate, m, monthEnd));
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

    /** [from,to] 구간 기록일의 일 평균 탄단지·kcal로 버킷 하나 */
    private Bucket bucketOf(String label, LocalDate start, Map<LocalDate, DayTotals> byDate,
                            LocalDate from, LocalDate to) {
        List<DayTotals> in = byDate.entrySet().stream()
                .filter(e -> !e.getKey().isBefore(from) && !e.getKey().isAfter(to))
                .map(Map.Entry::getValue).toList();
        int n = in.size();
        if (n == 0) {
            return new Bucket(label, start, 0, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO);
        }
        int kcal = (int) Math.round(in.stream().mapToInt(DayTotals::kcal).average().orElse(0));
        return new Bucket(label, start, kcal,
                mean(in, DayTotals::carb, n), mean(in, DayTotals::protein, n), mean(in, DayTotals::fat, n));
    }

    /** TDEE 시리즈 — 버킷별 대표일(오늘 이하) 기준 */
    private List<TdeePoint> tdeeSeries(Long memberId, Period period, List<Bucket> buckets, LocalDate today) {
        List<TdeePoint> series = new ArrayList<>();
        for (Bucket b : buckets) {
            // 월별 버킷은 월말(오늘 이하), 일별은 그 날. 미래는 제외
            LocalDate asOf = period == Period.TOTAL
                    ? b.startDate().with(TemporalAdjusters.lastDayOfMonth()) : b.startDate();
            if (asOf.isAfter(today)) {
                asOf = today;
            }
            if (b.startDate().isAfter(today)) {
                continue;
            }
            TdeeResponse t = tdeeService.get(memberId, asOf);
            series.add(new TdeePoint(b.label(), t.maintenanceKcal(), t.source()));
        }
        return series;
    }

    private LocalDate earliestLogDate(Long memberId, ZoneId zone) {
        List<Meal> meals = mealRepository.findByMemberIdAndEatenAtGreaterThanEqualAndEatenAtLessThanOrderByEatenAtAsc(
                memberId, Instant.EPOCH, LocalDate.now(clock).plusDays(1).atStartOfDay(zone).toInstant());
        return meals.isEmpty() ? null : meals.get(0).getEatenAt().atZone(zone).toLocalDate();
    }

    // --- 집계·신호 ---

    private Signals signals(List<DayTotals> days, MacroTargetG macro, Integer target,
                            Integer avgKcal, Integer maintenance, boolean cut, Integer onTargetDays) {
        int overTargetDays = target != null ? (int) days.stream().filter(d -> d.kcal() > target).count() : 0;
        int proteinDeficitDays = macro.proteinG() != null
                ? (int) days.stream().filter(d -> d.protein().doubleValue() < macro.proteinG()).count() : 0;
        int fatStreak = macro.fatG() != null ? WeeklyReportCalc.maxStreak(
                days.stream().map(d -> d.fat().doubleValue() > macro.fatG()).toList()) : 0;
        int carbStreak = macro.carbG() != null ? WeeklyReportCalc.maxStreak(
                days.stream().map(d -> d.carb().doubleValue() > macro.carbG()).toList()) : 0;
        return new Signals(days.size(), onTargetDays, overTargetDays, proteinDeficitDays,
                fatStreak, carbStreak, avgKcal, maintenance, cut);
    }

    private Map<LocalDate, DayTotals> dailyTotals(Long memberId, LocalDate from, LocalDate to, ZoneId zone) {
        Instant start = from.atStartOfDay(zone).toInstant();
        Instant end = to.plusDays(1).atStartOfDay(zone).toInstant();
        List<Meal> meals = mealRepository
                .findByMemberIdAndEatenAtGreaterThanEqualAndEatenAtLessThanOrderByEatenAtAsc(memberId, start, end);
        Map<LocalDate, DayTotals> byDate = new TreeMap<>();
        for (Meal m : meals) {
            LocalDate d = m.getEatenAt().atZone(zone).toLocalDate();
            byDate.merge(d, DayTotals.of(m), DayTotals::plus);
        }
        return byDate;
    }

    private BigDecimal mean(List<DayTotals> days, java.util.function.Function<DayTotals, BigDecimal> field, int n) {
        if (n == 0) {
            return BigDecimal.ZERO;
        }
        return days.stream().map(field).reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(n), 1, RoundingMode.HALF_UP);
    }

    private record Range(LocalDate start, LocalDate end) {
    }

    private record DayTotals(int kcal, BigDecimal carb, BigDecimal protein, BigDecimal fat) {
        static DayTotals of(Meal m) {
            return new DayTotals(m.getTotalKcal(), m.getCarbG(), m.getProteinG(), m.getFatG());
        }

        DayTotals plus(DayTotals o) {
            return new DayTotals(kcal + o.kcal, carb.add(o.carb), protein.add(o.protein), fat.add(o.fat));
        }
    }
}
