package com.kcalog.domain.report.service;

import com.kcalog.domain.report.dto.Period;
import com.kcalog.domain.report.dto.ReportResponse.Insight;
import com.kcalog.domain.report.service.ReportCalc.Signals;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ReportCalcTest {

    @Test
    @DisplayName("감량 목표는 섭취 ≤ 목표인 날만 달성")
    void onTargetCut() {
        assertThat(ReportCalc.onTargetDays(List.of(1800, 2100, 1900), 2000, true)).isEqualTo(2);
    }

    @Test
    @DisplayName("유지·증량은 목표 ±10% 밴드 안이면 달성")
    void onTargetBand() {
        assertThat(ReportCalc.onTargetDays(List.of(1800, 2200, 2300, 1700), 2000, false)).isEqualTo(2);
    }

    @Test
    @DisplayName("칼로리 비율은 4/4/9 환산, 합 100·음수 없음")
    void percent() {
        int[] p = ReportCalc.percent(200, 100, 50);
        assertThat(p[0] + p[1] + p[2]).isEqualTo(100);
        assertThat(p[0]).isGreaterThan(p[1]);
        // 반올림 경계에서도 음수가 나오지 않는다 (cp+pp가 101이 되던 케이스)
        int[] q = ReportCalc.percent(101, 99, 0);
        assertThat(q[0] + q[1] + q[2]).isEqualTo(100);
        assertThat(q).doesNotContain(-1);
        assertThat(q[2]).isGreaterThanOrEqualTo(0);
    }

    @Test
    @DisplayName("최대 연속 초과 — 미기록일(false)에서 끊긴다")
    void maxStreak() {
        assertThat(ReportCalc.maxStreak(List.of(true, true, false, true, true, true))).isEqualTo(3);
        assertThat(ReportCalc.maxStreak(List.of(true, false, true))).isEqualTo(1); // 간극으로 끊김
    }

    @Test
    @DisplayName("인사이트 — 부정 신호가 심각도 순으로 상위 3개")
    void insightsRanked() {
        Signals s = new Signals(6, 7, 1, 4, 4, 4, 4, 2400, 2000, true);
        List<Insight> out = ReportCalc.insights(s, Period.WEEK);
        assertThat(out).hasSize(3);
        assertThat(out.get(0).code()).isEqualTo("fat-streak");
    }

    @Test
    @DisplayName("주간은 '이번 주', 월간은 '이번 달'로 문구가 스케일된다")
    void periodScopedLabel() {
        // 저성실도 신호(기록 적음)로 스코프 문구 확인
        Signals week = new Signals(2, 7, 0, 0, 0, 0, 0, 1500, 2000, false);
        assertThat(ReportCalc.insights(week, Period.WEEK).get(0).message()).contains("이번 주");

        Signals month = new Signals(5, 30, 0, 0, 0, 0, 0, 1500, 2000, false);
        assertThat(ReportCalc.insights(month, Period.MONTH).get(0).message()).contains("이번 달");
    }

    @Test
    @DisplayName("긍정(잘하고 있어요)은 달성 비율 70% 이상일 때만 — 월간 5/30은 안 뜬다")
    void positiveByRatio() {
        Signals monthLow = new Signals(30, 30, 5, 0, 0, 0, 0, 1900, 2100, false); // 5/30 달성
        assertThat(ReportCalc.insights(monthLow, Period.MONTH))
                .noneMatch(i -> i.code().equals("on-track"));

        Signals monthHigh = new Signals(30, 30, 25, 0, 0, 0, 0, 1900, 2100, false); // 25/30
        assertThat(ReportCalc.insights(monthHigh, Period.MONTH))
                .anyMatch(i -> i.code().equals("on-track"));
    }
}
