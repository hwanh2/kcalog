package com.kcalog.domain.report.service;

import com.kcalog.domain.report.dto.ReportResponse.Insight;
import com.kcalog.domain.report.service.WeeklyReportCalc.Signals;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class WeeklyReportCalcTest {

    @Test
    @DisplayName("감량 목표는 섭취 ≤ 목표인 날만 달성")
    void onTargetCut() {
        assertThat(WeeklyReportCalc.onTargetDays(List.of(1800, 2100, 1900), 2000, true)).isEqualTo(2);
    }

    @Test
    @DisplayName("유지·증량은 목표 ±10% 밴드 안이면 달성")
    void onTargetBand() {
        // 목표 2000 → 밴드 1800~2200
        assertThat(WeeklyReportCalc.onTargetDays(List.of(1800, 2200, 2300, 1700), 2000, false)).isEqualTo(2);
    }

    @Test
    @DisplayName("칼로리 비율은 4/4/9 환산, 합 100")
    void percent() {
        int[] p = WeeklyReportCalc.percent(200, 100, 50); // 800/400/450 = 1650
        assertThat(p[0] + p[1] + p[2]).isEqualTo(100);
        assertThat(p[0]).isGreaterThan(p[1]); // 탄수 비중이 가장 큼
    }

    @Test
    @DisplayName("최대 연속 초과일")
    void maxStreak() {
        assertThat(WeeklyReportCalc.maxStreak(List.of(true, true, false, true, true, true))).isEqualTo(3);
        assertThat(WeeklyReportCalc.maxStreak(List.of(false, false))).isZero();
    }

    @Test
    @DisplayName("인사이트 — 부정 신호가 심각도 순으로, 상위 3개")
    void insightsRanked() {
        Signals s = new Signals(6, 1, 4, 4, 4, 4, 2400, 2000, true);
        List<Insight> out = WeeklyReportCalc.insights(s);
        assertThat(out).hasSize(3);
        assertThat(out.get(0).code()).isEqualTo("fat-streak"); // 최고 심각도
    }

    @Test
    @DisplayName("부정 신호가 없으면 긍정 인사이트")
    void insightsPositive() {
        Signals s = new Signals(6, 6, 0, 0, 0, 0, 1900, 2100, true);
        List<Insight> out = WeeklyReportCalc.insights(s);
        assertThat(out).extracting(Insight::code).contains("on-track");
    }
}
