package com.kcalog.domain.tdee.service;

/** 적응형 유지칼로리 순수 계산 — 에너지수지 역산·데이터 게이트(design D0/D1). Spring 비의존, TDD. */
public final class TdeeCalc {

    /** 역산 트레일링 창(일) */
    public static final int WINDOW_DAYS = 14;
    /** 실측을 신뢰할 최소 섭취 로깅 커버리지 */
    public static final double MIN_COVERAGE = 0.8;
    /** 추세 양끝 간 최소 일수 */
    public static final int MIN_SPAN_DAYS = 10;
    /** 체지방 1kg의 에너지(kcal) */
    public static final double KCAL_PER_KG = 7700;

    /**
     * 에너지수지 역산 — 유지칼로리 = 평균 일일섭취 − 일일 추세체중변화 × 7700.
     * 감량(trendDelta<0)이면 소비>섭취라 유지칼로리 > 섭취.
     */
    public static double reverse(double meanDailyIntake, double trendDeltaKg, int spanDays) {
        double dailyWeightChange = trendDeltaKg / spanDays; // kg/day
        return meanDailyIntake - dailyWeightChange * KCAL_PER_KG;
    }

    /** 실측을 낼 만큼 데이터가 충분한지 — 커버리지·span 게이트 */
    public static boolean enoughData(int loggedDays, int windowDays, int spanDays) {
        double coverage = windowDays == 0 ? 0 : (double) loggedDays / windowDays;
        return coverage >= MIN_COVERAGE && spanDays >= MIN_SPAN_DAYS;
    }

    private TdeeCalc() {
    }
}
