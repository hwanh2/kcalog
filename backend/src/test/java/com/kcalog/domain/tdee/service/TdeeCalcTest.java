package com.kcalog.domain.tdee.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.assertj.core.data.Offset;

import static org.assertj.core.api.Assertions.assertThat;

class TdeeCalcTest {

    @Test
    @DisplayName("감량 중이면 유지칼로리가 섭취보다 크다")
    void reverseCut() {
        // 평균 2000kcal, 14일간 추세 −0.4kg → 2000 + (0.4/14)*7700 ≈ 2220
        double tdee = TdeeCalc.reverse(2000, -0.4, 14);
        assertThat(tdee).isEqualTo(2220.0, Offset.offset(1.0));
    }

    @Test
    @DisplayName("증량 중이면 유지칼로리가 섭취보다 작다")
    void reverseBulk() {
        double tdee = TdeeCalc.reverse(2500, 0.4, 14);
        assertThat(tdee).isLessThan(2500);
    }

    @Test
    @DisplayName("체중 변화가 없으면 유지칼로리 = 평균 섭취")
    void reverseMaintain() {
        assertThat(TdeeCalc.reverse(2100, 0.0, 14)).isEqualTo(2100.0);
    }

    @Test
    @DisplayName("커버리지·span 게이트 — 둘 다 충족해야 실측")
    void enoughData() {
        assertThat(TdeeCalc.enoughData(12, 14, 12)).isTrue();  // 커버리지 0.86, span 12
        assertThat(TdeeCalc.enoughData(10, 14, 12)).isFalse(); // 커버리지 0.71 < 0.8
        assertThat(TdeeCalc.enoughData(12, 14, 8)).isFalse();  // span 8 < 10
    }
}
