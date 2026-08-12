package com.kcalog.domain.tdee.service;

import com.kcalog.domain.meal.service.MealDailyIntake;
import com.kcalog.domain.meal.service.MealDailyIntake.DailyNutrition;
import com.kcalog.domain.member.entity.Goal;
import com.kcalog.domain.member.entity.Member;
import com.kcalog.domain.member.repository.MemberRepository;
import com.kcalog.domain.member.service.DailyKcalCalculator;
import com.kcalog.domain.tdee.dto.TdeeResponse;
import com.kcalog.domain.weight.entity.WeightLog;
import com.kcalog.domain.weight.repository.WeightLogRepository;
import com.kcalog.domain.weight.service.WeightTrend;
import com.kcalog.global.common.ServiceDay;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

/**
 * 적응형 유지칼로리 — 최근 창의 실제 섭취·체중 추세로 TDEE를 역산(design D0~D4).
 * 데이터가 부족하면 공식 TDEE(Mifflin-St Jeor)로 폴백. 조회 시 계산(비영속).
 */
@Service
@RequiredArgsConstructor
public class TdeeService {

    private static final int SEED_BUFFER_DAYS = 30; // 추세 EMA 워밍업

    private final MemberRepository memberRepository;
    private final MealDailyIntake mealDailyIntake;
    private final WeightLogRepository weightLogRepository;
    private final DailyKcalCalculator calculator;
    private final Clock clock;

    @Transactional(readOnly = true)
    public TdeeResponse get(Long memberId) {
        return get(memberId, ServiceDay.today(clock));
    }

    /** asOf 날짜 기준 트레일링 창으로 유지칼로리 계산 — 주간 리포트의 일별 시리즈가 임의 날짜로 호출 */
    @Transactional(readOnly = true)
    public TdeeResponse get(Long memberId, LocalDate asOf) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new NoSuchElementException("회원을 찾을 수 없습니다"));
        Integer currentTarget = member.getDailyKcalTarget();

        LocalDate today = asOf;
        LocalDate from = today.minusDays(TdeeCalc.WINDOW_DAYS - 1L);
        ZoneId zone = clock.getZone();

        Map<LocalDate, DailyNutrition> daily = mealDailyIntake.byDate(memberId, from, today, zone);
        int loggedDays = daily.size();
        double meanIntake = daily.isEmpty() ? 0
                : daily.values().stream().mapToInt(DailyNutrition::kcal).average().orElse(0);
        TrendDelta trend = windowTrendDelta(memberId, from, today);
        double coverage = (double) loggedDays / TdeeCalc.WINDOW_DAYS;

        // 1) 적응형 우선 — 섭취·체중 추세만 있으면 프로필 없이도 실측 (design D1 이탈)
        Double maintenance = null;
        String status = null;
        String source = null;
        if (trend != null && TdeeCalc.enoughData(loggedDays, TdeeCalc.WINDOW_DAYS, trend.spanDays())) {
            maintenance = TdeeCalc.reverse(meanIntake, trend.deltaKg(), trend.spanDays());
            status = "OK";
            source = "ADAPTIVE";
        }

        WeightLog latest = weightLogRepository.findTopByMemberIdOrderByLogDateDesc(memberId).orElse(null);

        // 2) 적응형 불가면 공식 폴백 — 프로필·현재 체중 필요
        if (maintenance == null && latest != null && profileComplete(member)) {
            maintenance = calculator.maintenance(member.getGender(), member.getBirthYear(),
                    member.getHeightCm(), latest.getWeightKg(), member.getActivityLevel());
            status = "INSUFFICIENT_DATA";
            source = "FORMULA";
        }

        // 3) 둘 다 불가 → 데이터 부족(빈 값)
        if (maintenance == null) {
            return TdeeResponse.insufficient(currentTarget, TdeeCalc.WINDOW_DAYS);
        }

        // 추천 목표는 목표 방향과 성별이 있으면 산출 — 방향이 저장되지 않은 회원만 목표체중 비교로 폴백.
        // 방향도 목표체중도 없으면 추천할 근거가 없어 null.
        Goal goal = member.getGoal() != null ? member.getGoal()
                : (member.getTargetWeightKg() != null && latest != null
                        ? Goal.fromWeights(latest.getWeightKg(), member.getTargetWeightKg()) : null);
        Integer recommended = (goal != null && member.getGender() != null)
                ? calculator.toTarget(maintenance, member.getGender(), goal)
                : null;

        return new TdeeResponse(status, roundTo10(maintenance), source, currentTarget, recommended,
                TdeeCalc.WINDOW_DAYS, round2(coverage));
    }

    /** 창 내 EMA 추세값의 (마지막 − 처음)과 두 기준일 간 일수. 창 내 기록이 2개 미만이면 null */
    private TrendDelta windowTrendDelta(Long memberId, LocalDate from, LocalDate to) {
        List<WeightLog> logs = weightLogRepository.findByMemberIdAndLogDateBetweenOrderByLogDateAsc(
                memberId, from.minusDays(SEED_BUFFER_DAYS), to);
        if (logs.size() < 2) {
            return null;
        }
        double[] weights = logs.stream().mapToDouble(l -> l.getWeightKg().doubleValue()).toArray();
        double[] trend = WeightTrend.ema(weights, WeightTrend.DEFAULT_ALPHA);

        Integer firstIdx = null;
        Integer lastIdx = null;
        for (int i = 0; i < logs.size(); i++) {
            if (!logs.get(i).getLogDate().isBefore(from)) { // 창 안(from 이후)
                if (firstIdx == null) {
                    firstIdx = i;
                }
                lastIdx = i;
            }
        }
        if (firstIdx == null || lastIdx.equals(firstIdx)) {
            return null;
        }
        int spanDays = (int) ChronoUnit.DAYS.between(logs.get(firstIdx).getLogDate(), logs.get(lastIdx).getLogDate());
        return new TrendDelta(trend[lastIdx] - trend[firstIdx], spanDays);
    }

    private boolean profileComplete(Member m) {
        return m.getGender() != null && m.getBirthYear() != null && m.getHeightCm() != null
                && m.getActivityLevel() != null;
    }

    private static int roundTo10(double v) {
        return (int) (Math.round(v / 10.0) * 10);
    }

    private static double round2(double v) {
        return Math.round(v * 100) / 100.0;
    }

    private record TrendDelta(double deltaKg, int spanDays) {
    }
}
