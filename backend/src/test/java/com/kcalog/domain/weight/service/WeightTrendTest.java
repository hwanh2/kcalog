package com.kcalog.domain.weight.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class WeightTrendTest {

    @Test
    @DisplayName("빈 입력은 빈 배열")
    void empty() {
        assertThat(WeightTrend.ema(new double[] {}, 0.1)).isEmpty();
    }

    @Test
    @DisplayName("첫 값은 원시값과 같다(seed)")
    void seedsWithFirst() {
        double[] trend = WeightTrend.ema(new double[] {70.0}, 0.1);
        assertThat(trend[0]).isEqualTo(70.0);
    }

    @Test
    @DisplayName("EMA는 원시값을 평활한다 — trend[i]=trend[i-1]+α(w-trend[i-1])")
    void smooths() {
        double[] trend = WeightTrend.ema(new double[] {70.0, 72.0}, 0.1);
        // 70 + 0.1*(72-70) = 70.2
        assertThat(trend[1]).isEqualTo(70.2, org.assertj.core.data.Offset.offset(1e-9));
    }

    @Test
    @DisplayName("일정한 값이 이어지면 추세는 그 값으로 수렴한다")
    void convergesToConstant() {
        double[] weights = new double[50];
        java.util.Arrays.fill(weights, 65.0);
        double[] trend = WeightTrend.ema(weights, 0.1);
        assertThat(trend[49]).isEqualTo(65.0, org.assertj.core.data.Offset.offset(1e-6));
    }
}
