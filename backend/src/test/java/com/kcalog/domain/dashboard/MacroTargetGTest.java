package com.kcalog.domain.dashboard;

import com.kcalog.domain.dashboard.service.MacroTargetG;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 매크로 목표(g) 파생 계산 (TDD, design D1, D2, D6).
 *
 * 단백질은 비율로 구한 뒤 **체중당 1.2~2.0g으로 자른다**. 비율만 쓰면 칼로리가 큰 회원은
 * 2.8 g/kg까지 부풀고, 감량 회원은 근손실을 막는 선 아래로 떨어진다.
 * 잘려서 남거나 모자란 칼로리는 전부 탄수화물이 흡수한다. 지방은 이미 하한 근처다.
 */
class MacroTargetGTest {

    static BigDecimal kg(String value) {
        return new BigDecimal(value);
    }

    @Nested
    @DisplayName("비율")
    class Ratios {

        @Test
        @DisplayName("근육량이 목표가 아니면 탄 55 / 단 20 / 지 25")
        void withoutMuscleGoal() {
            MacroTargetG target = MacroTargetG.from(2700, kg("73"), false);

            // 단 2700×0.2/4=135(1.85 g/kg, 범위 안), 지 2700×0.25/9=75, 탄 나머지 1485/4=371.25→371
            assertThat(target.proteinG()).isEqualTo(135);
            assertThat(target.fatG()).isEqualTo(75);
            assertThat(target.carbG()).isEqualTo(371);
        }

        @Test
        @DisplayName("근육량이 목표면 탄 45 / 단 30 / 지 25. 탄수만 내려서 단백질로 보낸다")
        void withMuscleGoal() {
            MacroTargetG target = MacroTargetG.from(2700, kg("73"), true);

            // 단 2700×0.3/4=202.5 → 상한 73×2.0=146, 지 75(기본과 같다), 탄 (2700−584−675)/4=360.25→360
            assertThat(target.proteinG()).isEqualTo(146);
            assertThat(target.carbG()).isEqualTo(360);
        }

        @Test
        @DisplayName("지방 비율은 근육량 목표 여부와 무관하게 25%. 켰더니 지방이 줄어드는 역전을 막는다")
        void fatRatioDoesNotDependOnMuscleGoal() {
            assertThat(MacroTargetG.from(2700, kg("73"), false).fatG())
                    .isEqualTo(MacroTargetG.from(2700, kg("73"), true).fatG());
        }
    }

    @Nested
    @DisplayName("단백질 체중 범위")
    class ProteinBand {

        @Test
        @DisplayName("상한. 체중×2.0을 넘지 않는다")
        void clampsToUpperBound() {
            // 여 62kg 2600kcal 근육량 목표, 증량: 비율 195g(3.15 g/kg) → 124g
            MacroTargetG target = MacroTargetG.from(2600, kg("62"), true);

            assertThat(target.proteinG()).isEqualTo(124);
        }

        @Test
        @DisplayName("하한. 체중×1.2 아래로 내려가지 않는다")
        void clampsToLowerBound() {
            // 남 90kg 2000kcal 감량: 비율 100g(1.11 g/kg) → 108g
            MacroTargetG target = MacroTargetG.from(2000, kg("90"), false);

            assertThat(target.proteinG()).isEqualTo(108);
        }

        @Test
        @DisplayName("범위 안이면 비율 그대로 둔다")
        void keepsRatioInsideBand() {
            // 여 55kg 1940kcal: 비율 97g(1.76 g/kg). 범위 66~110 안
            MacroTargetG target = MacroTargetG.from(1940, kg("55"), false);

            assertThat(target.proteinG()).isEqualTo(97);
        }

        @Test
        @DisplayName("상한에 잘린 칼로리는 탄수화물로 간다. 지방은 건드리지 않는다")
        void clampedKcalGoesToCarb() {
            MacroTargetG capped = MacroTargetG.from(2700, kg("73"), true);
            MacroTargetG uncapped = MacroTargetG.from(2700, null, true);

            // 자르지 않으면 단 203g. 자르면 146g으로 줄고 그만큼 탄수가 늘어난다
            assertThat(uncapped.proteinG()).isEqualTo(203);
            assertThat(capped.proteinG()).isLessThan(uncapped.proteinG());
            assertThat(capped.carbG()).isGreaterThan(uncapped.carbG());
            assertThat(capped.fatG()).isEqualTo(uncapped.fatG());
        }

        @Test
        @DisplayName("하한에 올린 칼로리는 탄수화물에서 뺀다")
        void raisedKcalComesFromCarb() {
            MacroTargetG raised = MacroTargetG.from(2000, kg("90"), false);
            MacroTargetG plain = MacroTargetG.from(2000, null, false);

            assertThat(raised.proteinG()).isGreaterThan(plain.proteinG());
            assertThat(raised.carbG()).isLessThan(plain.carbG());
            assertThat(raised.fatG()).isEqualTo(plain.fatG());
        }
    }

    @Nested
    @DisplayName("합계")
    class Sum {

        /**
         * 화면은 세 값을 그대로 보여준다. 반올림 전 값으로 나머지를 구하면 보이는 합이
         * 목표와 어긋나 보인다. g으로 반올림한 뒤 역산해야 한다(design D11).
         */
        @Test
        @DisplayName("세 값을 kcal로 되돌리면 목표 칼로리와 맞는다 (반올림 오차 이내)")
        void sumsBackToTarget() {
            int[] targets = {1200, 1440, 1620, 1940, 2000, 2600, 2700, 3000};
            String[] weights = {"45", "55", "62", "73", "90"};

            for (int kcal : targets) {
                for (String weight : weights) {
                    for (boolean muscle : new boolean[]{true, false}) {
                        MacroTargetG target = MacroTargetG.from(kcal, kg(weight), muscle);
                        int sum = target.carbG() * 4 + target.proteinG() * 4 + target.fatG() * 9;

                        assertThat(sum)
                                .as("%dkcal, %skg, 근육량목표 %s", kcal, weight, muscle)
                                .isBetween(kcal - 3, kcal + 3);
                    }
                }
            }
        }
    }

    @Nested
    @DisplayName("값이 없을 때")
    class Missing {

        @Test
        @DisplayName("체중을 모르면 범위 제한 없이 비율만 쓴다. 목표를 통째로 비우는 것보다 낫다")
        void withoutWeight() {
            MacroTargetG target = MacroTargetG.from(2700, null, false);

            // 단 135(범위를 적용할 수 없다), 지 75, 탄 371
            assertThat(target.proteinG()).isEqualTo(135);
            assertThat(target.fatG()).isEqualTo(75);
            assertThat(target.carbG()).isEqualTo(371);
        }

        @Test
        @DisplayName("칼로리 목표가 없으면 세 값 모두 null")
        void withoutKcalTarget() {
            MacroTargetG target = MacroTargetG.from(null, kg("73"), true);

            assertThat(target.carbG()).isNull();
            assertThat(target.proteinG()).isNull();
            assertThat(target.fatG()).isNull();
        }
    }
}
