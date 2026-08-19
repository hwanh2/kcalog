package com.kcalog.domain.coaching.service;

import com.kcalog.domain.meal.service.MealDailyIntake;
import com.kcalog.domain.meal.service.MealDailyIntake.DailyNutrition;
import com.kcalog.domain.member.entity.Member;
import com.kcalog.domain.member.repository.MemberRepository;
import com.kcalog.domain.report.dto.Period;
import com.kcalog.domain.report.dto.ReportResponse;
import com.kcalog.domain.report.service.ReportService;
import com.kcalog.domain.tdee.dto.TdeeResponse;
import com.kcalog.domain.tdee.service.TdeeService;
import com.kcalog.domain.weight.entity.WeightLog;
import com.kcalog.domain.weight.repository.WeightLogRepository;
import com.kcalog.domain.weight.service.WeightStats;
import com.kcalog.domain.weight.service.WeightTrend;
import com.kcalog.global.common.ServiceDay;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

/**
 * 코칭 신호 수집 — 기존 서비스(리포트·TDEE·체중)를 모아 {@link CoachingSignals} 스냅샷으로 조립한다.
 * 신규 계산은 하지 않는다(체중 7일 추세·연속만 여기서 파생). 숫자는 여기서, 서술은 LLM에서.
 */
@Component
@RequiredArgsConstructor
public class CoachingSignalsCollector {

    // 칭찬 판정도 같은 창과 계산을 쓴다(PraiseSignalsCollector) — 두 벌 두면 한쪽만 고쳐지는 날이 온다
    static final int TREND_WINDOW_DAYS = 7;
    static final int SEED_BUFFER_DAYS = 30;  // EMA 워밍업(TdeeService와 동일 취지)
    private static final int STREAK_LOOKBACK_DAYS = 60;

    private final ReportService reportService;
    private final TdeeService tdeeService;
    private final MealDailyIntake mealDailyIntake;
    private final WeightLogRepository weightLogRepository;
    private final MemberRepository memberRepository;
    private final Clock clock;

    @Transactional(readOnly = true)
    public CoachingSignals collect(Long memberId) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new NoSuchElementException("회원을 찾을 수 없습니다"));
        LocalDate today = ServiceDay.today(clock);
        // 체중은 달력 날짜로 저장된다(ServiceDay 미적용 — 아침 공복 측정이라 달력 기준이 자연스럽다).
        // 섭취용 today를 체중 조회에 그대로 쓰면 00~05시 사이에 하루가 어긋나, 방금 기록한
        // 오늘 체중이 조회 구간 밖으로 밀려 연속일이 0으로 보인다.
        LocalDate calendarToday = LocalDate.now(clock);
        ZoneId zone = clock.getZone();

        ReportResponse week = reportService.get(memberId, Period.WEEK, null);
        TdeeResponse tdee = tdeeService.get(memberId);

        DailyNutrition todayN = mealDailyIntake.byDate(memberId, today, today, zone).get(today);
        Integer todayKcal = todayN == null ? null : todayN.kcal();
        Double todayCarb = todayN == null ? null : todayN.carbG().doubleValue();
        Double todayProtein = todayN == null ? null : todayN.proteinG().doubleValue();
        Double todayFat = todayN == null ? null : todayN.fatG().doubleValue();

        WeightLog latest = weightLogRepository.findTopByMemberIdOrderByLogDateDesc(memberId).orElse(null);
        Double latestWeight = latest == null ? null : latest.getWeightKg().doubleValue();
        boolean cut = member.getTargetWeightKg() != null && latest != null
                && member.getTargetWeightKg().doubleValue() < latest.getWeightKg().doubleValue();

        return new CoachingSignals(
                today, member.getDailyKcalTarget(), cut,
                todayKcal, todayCarb, todayProtein, todayFat,
                week.daysLogged(), week.avgKcal(), week.onTargetDays(),
                week.carbPct(), week.proteinPct(), week.fatPct(),
                tdee.maintenanceKcal(), tdee.source(), tdee.recommendedTargetKcal(),
                weightLoss7d(memberId, calendarToday), weightStreak(memberId, calendarToday), latestWeight,
                week.insights().stream().map(ReportResponse.Insight::message).toList());
    }

    /** 최근 7일 추세(EMA) 체중 변화 — 창 안 기록이 2개 미만이면 null */
    private Double weightLoss7d(Long memberId, LocalDate today) {
        LocalDate windowStart = today.minusDays(TREND_WINDOW_DAYS - 1L);
        return trendChange(weightLogRepository.findByMemberIdAndLogDateBetweenOrderByLogDateAsc(
                memberId, windowStart.minusDays(SEED_BUFFER_DAYS), today), windowStart);
    }

    /** 조회한 기록에서 창 구간의 추세 변화를 낸다. 칭찬 판정이 같은 계산을 쓴다 */
    static Double trendChange(List<WeightLog> logs, LocalDate windowStart) {
        if (logs.size() < 2) {
            return null;
        }
        double[] weights = logs.stream().mapToDouble(l -> l.getWeightKg().doubleValue()).toArray();
        double[] trend = WeightTrend.ema(weights, WeightTrend.DEFAULT_ALPHA);
        Integer firstIdx = null;
        int lastIdx = logs.size() - 1;
        for (int i = 0; i < logs.size(); i++) {
            if (!logs.get(i).getLogDate().isBefore(windowStart)) {
                firstIdx = i;
                break;
            }
        }
        if (firstIdx == null || firstIdx == lastIdx) {
            return null;
        }
        return Math.round((trend[lastIdx] - trend[firstIdx]) * 10.0) / 10.0;
    }

    private int weightStreak(Long memberId, LocalDate today) {
        List<LocalDate> dates = weightLogRepository.findByMemberIdAndLogDateBetweenOrderByLogDateAsc(
                        memberId, today.minusDays(STREAK_LOOKBACK_DAYS), today)
                .stream().map(WeightLog::getLogDate).toList();
        return WeightStats.streak(dates);
    }
}
