package com.kcalog.domain.coaching.service;

import com.kcalog.domain.meal.service.MealDailyIntake;
import com.kcalog.domain.meal.service.MealDailyIntake.DailyNutrition;
import com.kcalog.domain.member.entity.Member;
import com.kcalog.domain.member.repository.MemberRepository;
import com.kcalog.domain.weight.entity.WeightLog;
import com.kcalog.domain.weight.repository.WeightLogRepository;
import com.kcalog.global.common.ServiceDay;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.time.temporal.IsoFields;

/**
 * 칭찬 판정 재료 수집.
 * <p>
 * {@link CoachingSignalsCollector}를 쓰지 않는다. 그쪽은 리포트와 TDEE까지 계산하는데 칭찬에는 과하다.
 * 이 경로는 회원이 화면을 옮길 때마다 도므로 조회를 최소로 유지한다(design D8).
 */
@Component
@RequiredArgsConstructor
public class PraiseSignalsCollector {

    /** 연속 기록 이정표의 최대가 100일이라 그만큼은 봐야 한다 */
    private static final int MEAL_LOOKBACK_DAYS = 100;

    private final MealDailyIntake mealDailyIntake;
    private final WeightLogRepository weightLogRepository;
    private final MemberRepository memberRepository;
    private final Clock clock;

    @Transactional(readOnly = true)
    public PraiseSignals collect(Long memberId) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new NoSuchElementException("회원을 찾을 수 없습니다"));

        ZoneId zone = clock.getZone();
        LocalDate today = ServiceDay.today(clock);
        // 하루 목표는 끝난 날에 대해서만 판정한다. 오늘은 아직 더 먹을 수 있다
        LocalDate judgedDay = today.minusDays(1);
        /*
          체중은 달력 날짜로 저장된다(ServiceDay 미적용. 아침 공복 측정이라 달력 기준이 자연스럽다).
          섭취용 today를 체중 조회에 그대로 쓰면 00~05시 사이에 하루가 어긋난다.
        */
        LocalDate calendarToday = LocalDate.now(clock);

        Map<LocalDate, DailyNutrition> byDate =
                mealDailyIntake.byDate(memberId, today.minusDays(MEAL_LOOKBACK_DAYS - 1L), today, zone);
        List<LocalDate> mealDays = new ArrayList<>(byDate.keySet()); // TreeMap이라 오름차순
        DailyNutrition judged = byDate.get(judgedDay);

        return new PraiseSignals(
                mealDays,
                judgedDay,
                judged == null ? null : judged.kcal(),
                member.getDailyKcalTarget(),
                isCut(member),
                weightTrend(memberId, calendarToday),
                isoWeek(calendarToday),
                mealDailyIntake.earliestDate(memberId, zone) != null,
                weightLogRepository.findTopByMemberIdOrderByLogDateDesc(memberId).isPresent());
    }

    /** 목표 체중이 최근 체중보다 낮으면 감량 목표. CoachingSignalsCollector와 같은 판단 */
    private boolean isCut(Member member) {
        if (member.getTargetWeightKg() == null) {
            return false;
        }
        return weightLogRepository.findTopByMemberIdOrderByLogDateDesc(member.getId())
                .map(latest -> member.getTargetWeightKg().doubleValue() < latest.getWeightKg().doubleValue())
                .orElse(false);
    }

    private Double weightTrend(Long memberId, LocalDate calendarToday) {
        LocalDate windowStart = calendarToday.minusDays(CoachingSignalsCollector.TREND_WINDOW_DAYS - 1L);
        List<WeightLog> logs = weightLogRepository.findByMemberIdAndLogDateBetweenOrderByLogDateAsc(
                memberId, windowStart.minusDays(CoachingSignalsCollector.SEED_BUFFER_DAYS), calendarToday);
        return CoachingSignalsCollector.trendChange(logs, windowStart);
    }

    /** 체중 추세 칭찬을 주 1회로 묶는 키. 연말 경계에서 어긋나지 않도록 ISO 주 기준 연도를 쓴다 */
    private static String isoWeek(LocalDate date) {
        return "%d-W%02d".formatted(
                date.get(IsoFields.WEEK_BASED_YEAR), date.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR));
    }
}
