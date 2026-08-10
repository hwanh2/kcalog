package com.kcalog.domain.weight.service;

/** 체중 추세 = 지수이동평균(EMA). 노이즈(수분·식사) 제거용 평활선(design D3). */
public final class WeightTrend {

    /** 평활계수 — 작을수록 완만(≈1/α 일 span). 0.1 ≈ 10일. */
    public static final double DEFAULT_ALPHA = 0.1;

    /**
     * 오름차순 체중 시퀀스의 EMA. trend[0]=weights[0], trend[i]=trend[i-1]+α·(weights[i]−trend[i-1]).
     * 결측일은 보간하지 않고 기록된 값만 순서대로 본다(MVP).
     */
    public static double[] ema(double[] weights, double alpha) {
        double[] trend = new double[weights.length];
        if (weights.length == 0) {
            return trend;
        }
        trend[0] = weights[0];
        for (int i = 1; i < weights.length; i++) {
            trend[i] = trend[i - 1] + alpha * (weights[i] - trend[i - 1]);
        }
        return trend;
    }

    private WeightTrend() {
    }
}
