package com.kcalog.domain.weight.service;

import com.kcalog.domain.weight.dto.BmiInfo;
import com.kcalog.domain.weight.dto.BmiInfo.BmiCategory;
import com.kcalog.domain.weight.dto.ProjectionInfo;
import com.kcalog.domain.weight.dto.ProjectionInfo.ProjectionStatus;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;

/** BMI·연속 기록·목표 예상 순수 계산(design D4~D6). Spring 비의존 — 스펙 시나리오로 TDD. */
public final class WeightStats {

    /** 목표 예상에 필요한 최소 기록 점 수 — 미만이면 데이터 부족 */
    public static final int MIN_POINTS_FOR_PROJECTION = 14;
    /** 추세 기울기가 사실상 평평하다고 보는 임계(kg/day) — 무한대·과거 예상 방지 */
    public static final double FLAT_SLOPE_EPS = 0.005;
    /** 이미 목표에 도달했다고 보는 잔여(kg) */
    private static final double REACHED_EPS = 0.1;

    /** BMI = 체중 / (키m)². 아시아-태평양 기준 분류. 신장이 없거나 0이면 null(계산 안 함). */
    public static BmiInfo bmi(BigDecimal weightKg, BigDecimal heightCm) {
        if (weightKg == null || heightCm == null || heightCm.signum() <= 0) {
            return null;
        }
        double h = heightCm.doubleValue() / 100.0;
        BigDecimal value = BigDecimal.valueOf(weightKg.doubleValue() / (h * h))
                .setScale(1, RoundingMode.HALF_UP);
        return new BmiInfo(value, categorize(value.doubleValue()));
    }

    private static BmiCategory categorize(double v) {
        if (v < 18.5) {
            return BmiCategory.UNDERWEIGHT;
        }
        if (v < 23.0) {
            return BmiCategory.NORMAL;
        }
        if (v < 25.0) {
            return BmiCategory.OVERWEIGHT;
        }
        return BmiCategory.OBESE;
    }

    /** 최신 기록일부터 하루씩 뒤로 가며 연속 기록 일수(첫 공백에서 멈춤). 오름차순 날짜, 중복 없음 가정. */
    public static int streak(List<LocalDate> datesAsc) {
        int n = datesAsc.size();
        if (n == 0) {
            return 0;
        }
        int streak = 1;
        for (int i = n - 1; i > 0; i--) {
            if (datesAsc.get(i - 1).equals(datesAsc.get(i).minusDays(1))) {
                streak++;
            } else {
                break;
            }
        }
        return streak;
    }

    /**
     * 목표 도달 예상 — 최근 {@link #MIN_POINTS_FOR_PROJECTION}개 추세점의 선형회귀 기울기로 외삽.
     * anchorDate(최신 기록일)에서 목표까지 남은 양을 기울기로 나눠 예상일을 낸다. 가드로 허황된 날짜를 막는다.
     */
    public static ProjectionInfo project(List<LocalDate> datesAsc, double[] trend,
                                         BigDecimal targetKg, LocalDate anchorDate) {
        if (targetKg == null) {
            return ProjectionInfo.noGoal();
        }
        int n = datesAsc.size();
        if (n < MIN_POINTS_FOR_PROJECTION) {
            return ProjectionInfo.of(ProjectionStatus.INSUFFICIENT_DATA, targetKg);
        }
        double latestTrend = trend[n - 1];
        double remaining = targetKg.doubleValue() - latestTrend;
        double slope = slope(datesAsc, trend, n - MIN_POINTS_FOR_PROJECTION, n); // kg/day
        BigDecimal weeklyRate = BigDecimal.valueOf(slope * 7).setScale(2, RoundingMode.HALF_UP);
        if (Math.abs(remaining) < REACHED_EPS) {
            return new ProjectionInfo(ProjectionStatus.ON_TRACK, targetKg, anchorDate, 0, weeklyRate);
        }
        // 평평하거나 목표 반대 방향이면 예상하지 않는다
        if (Math.abs(slope) < FLAT_SLOPE_EPS || Math.signum(slope) != Math.signum(remaining)) {
            return ProjectionInfo.of(ProjectionStatus.NOT_APPROACHING, targetKg);
        }
        long days = Math.round(remaining / slope);
        return new ProjectionInfo(ProjectionStatus.ON_TRACK, targetKg,
                anchorDate.plusDays(days), (int) Math.round(days / 7.0), weeklyRate);
    }

    /** (epochDay, trend) 최소제곱 기울기 — kg/day */
    private static double slope(List<LocalDate> dates, double[] trend, int start, int end) {
        int m = end - start;
        double sx = 0, sy = 0, sxx = 0, sxy = 0;
        for (int i = start; i < end; i++) {
            double x = dates.get(i).toEpochDay();
            double y = trend[i];
            sx += x;
            sy += y;
            sxx += x * x;
            sxy += x * y;
        }
        double denom = m * sxx - sx * sx;
        return denom == 0 ? 0 : (m * sxy - sx * sy) / denom;
    }

    private WeightStats() {
    }
}
