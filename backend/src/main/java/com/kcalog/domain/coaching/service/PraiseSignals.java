package com.kcalog.domain.coaching.service;

import java.time.LocalDate;
import java.util.List;

/**
 * 칭찬 판정에 필요한 최소 재료.
 * <p>
 * {@link CoachingSignals}를 쓰지 않는다. 그쪽은 리포트와 TDEE까지 계산하는데, 칭찬 감지는
 * 화면을 옮길 때마다 도는 경로라 그 비용을 얹을 수 없다(design D8).
 *
 * @param mealDays        식사 기록이 있는 서비스일, 오름차순 중복 없음
 * @param judgedDay       하루 목표를 판정하는 날(지난 서비스일)
 * @param judgedDayKcal   그날 섭취 합계. 기록이 없으면 null
 * @param dailyKcalTarget 회원의 일일 목표 칼로리. 없으면 null
 * @param cut             감량이 목표인가
 * @param weightTrend7d   7일 추세 체중 변화(kg). 계산할 수 없으면 null
 * @param isoWeek         체중 추세 칭찬의 주 단위 키에 쓸 값
 * @param hasAnyMeal      식사 기록이 하나라도 있나
 * @param hasAnyWeight    체중 기록이 하나라도 있나
 */
public record PraiseSignals(
        List<LocalDate> mealDays,
        LocalDate judgedDay,
        Integer judgedDayKcal,
        Integer dailyKcalTarget,
        boolean cut,
        Double weightTrend7d,
        String isoWeek,
        boolean hasAnyMeal,
        boolean hasAnyWeight
) {
}
