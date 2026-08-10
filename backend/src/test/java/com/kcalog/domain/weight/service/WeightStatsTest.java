package com.kcalog.domain.weight.service;

import com.kcalog.domain.weight.dto.BmiInfo.BmiCategory;
import com.kcalog.domain.weight.dto.ProjectionInfo;
import com.kcalog.domain.weight.dto.ProjectionInfo.ProjectionStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

class WeightStatsTest {

    // --- BMI ---

    @Test
    @DisplayName("BMI 계산·아시아 기준 분류")
    void bmiCategories() {
        // 170cm, 64.9kg → 22.5 정상, 66.4 → 23.0 과체중, 72.3 → 25.0 비만
        assertThat(WeightStats.bmi(bd("64.9"), bd("170")).category()).isEqualTo(BmiCategory.NORMAL);
        assertThat(WeightStats.bmi(bd("66.5"), bd("170")).category()).isEqualTo(BmiCategory.OVERWEIGHT);
        assertThat(WeightStats.bmi(bd("72.3"), bd("170")).category()).isEqualTo(BmiCategory.OBESE);
        assertThat(WeightStats.bmi(bd("50.0"), bd("170")).category()).isEqualTo(BmiCategory.UNDERWEIGHT);
    }

    @Test
    @DisplayName("신장이 없으면 BMI는 null")
    void bmiNoHeight() {
        assertThat(WeightStats.bmi(bd("70"), null)).isNull();
        assertThat(WeightStats.bmi(bd("70"), bd("0"))).isNull();
    }

    // --- streak ---

    @Test
    @DisplayName("최신일부터 연속 기록 일수를 센다")
    void streakConsecutive() {
        assertThat(WeightStats.streak(List.of(d("2026-08-08"), d("2026-08-09"), d("2026-08-10")))).isEqualTo(3);
    }

    @Test
    @DisplayName("공백이 있으면 최신일부터 첫 공백 전까지만 센다")
    void streakWithGap() {
        // 8/6, (8/7 없음), 8/9, 8/10 → 최신부터 8/10,8/9 연속 2, 8/8 없어 멈춤
        assertThat(WeightStats.streak(List.of(d("2026-08-06"), d("2026-08-09"), d("2026-08-10")))).isEqualTo(2);
    }

    @Test
    @DisplayName("기록 없음은 0, 하나면 1")
    void streakEdges() {
        assertThat(WeightStats.streak(List.of())).isZero();
        assertThat(WeightStats.streak(List.of(d("2026-08-10")))).isEqualTo(1);
    }

    // --- projection ---

    /** start부터 하루 간격으로 dailyDelta씩 변하는 n일치 (dates, trend=weights) */
    private List<LocalDate> dates(String start, int n) {
        LocalDate s = d(start);
        return IntStream.range(0, n).mapToObj(s::plusDays).toList();
    }

    private double[] line(double startKg, double dailyDelta, int n) {
        return IntStream.range(0, n).mapToDouble(i -> startKg + dailyDelta * i).toArray();
    }

    @Test
    @DisplayName("목표 없음 → NO_GOAL")
    void projectNoGoal() {
        assertThat(WeightStats.project(dates("2026-07-01", 20), line(70, -0.1, 20), null, d("2026-07-20")).status())
                .isEqualTo(ProjectionStatus.NO_GOAL);
    }

    @Test
    @DisplayName("데이터가 최소일 미만 → INSUFFICIENT_DATA")
    void projectInsufficient() {
        assertThat(WeightStats.project(dates("2026-07-01", 10), line(70, -0.1, 10), bd("65"), d("2026-07-10")).status())
                .isEqualTo(ProjectionStatus.INSUFFICIENT_DATA);
    }

    @Test
    @DisplayName("추세가 목표 방향으로 움직이면 예상일을 낸다")
    void projectOnTrack() {
        // 70kg에서 하루 -0.1kg, 목표 65kg → 남은 5kg / 0.1 = 50일 뒤
        ProjectionInfo p = WeightStats.project(
                dates("2026-06-01", 20), line(70, -0.1, 20), bd("65"), d("2026-06-20"));
        assertThat(p.status()).isEqualTo(ProjectionStatus.ON_TRACK);
        // anchor 6/20의 추세 ≈ 70-0.1*19=68.1, 남은 3.1kg/0.1=31일 → 7/21 근처
        assertThat(p.projectedDate()).isAfter(d("2026-06-20"));
        assertThat(p.weeks()).isNotNull();
    }

    @Test
    @DisplayName("추세가 평평하면 NOT_APPROACHING")
    void projectFlat() {
        assertThat(WeightStats.project(dates("2026-06-01", 20), line(70, 0.0, 20), bd("65"), d("2026-06-20")).status())
                .isEqualTo(ProjectionStatus.NOT_APPROACHING);
    }

    @Test
    @DisplayName("추세가 목표에서 멀어지면 NOT_APPROACHING")
    void projectAwayFromGoal() {
        // 목표 65인데 계속 늘어남(+0.1) → 멀어짐
        assertThat(WeightStats.project(dates("2026-06-01", 20), line(70, 0.1, 20), bd("65"), d("2026-06-20")).status())
                .isEqualTo(ProjectionStatus.NOT_APPROACHING);
    }

    private static BigDecimal bd(String s) {
        return new BigDecimal(s);
    }

    private static LocalDate d(String s) {
        return LocalDate.parse(s);
    }
}
