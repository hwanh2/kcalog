package com.kcalog.domain.coaching.service;

import com.kcalog.domain.coaching.entity.PraiseKind;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("칭찬 판정 규칙")
class PraiseRulesTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 8, 19);
    private static final LocalDate YESTERDAY = TODAY.minusDays(1);

    /** 연속 n일. 판정일에서 거꾸로 채운다 */
    private static List<LocalDate> consecutiveDays(int n) {
        return IntStream.range(0, n).mapToObj(i -> TODAY.minusDays(n - 1L - i)).toList();
    }

    private static PraiseSignals signals(List<LocalDate> mealDays, Integer judgedKcal, Integer target,
                                         boolean cut, Double trend, boolean hasMeal, boolean hasWeight) {
        return new PraiseSignals(mealDays, YESTERDAY, judgedKcal, target, cut, trend,
                "2026-W34", hasMeal, hasWeight);
    }

    /** 대부분의 테스트가 관심 없는 축은 꺼둔다 */
    private static PraiseSignals onlyMealDays(List<LocalDate> mealDays) {
        return signals(mealDays, null, 2000, true, null, true, true);
    }

    private static List<String> keysOf(List<PraiseCandidate> found) {
        return found.stream().map(PraiseCandidate::dedupeKey).toList();
    }

    @Nested
    @DisplayName("첫걸음")
    class FirstStep {

        @Test
        @DisplayName("첫 식사 기록을 칭찬한다")
        void firstMeal() {
            PraiseSignals s = signals(consecutiveDays(1), null, 2000, true, null, true, false);

            assertThat(keysOf(PraiseRules.detect(s))).contains("first:meal");
        }

        @Test
        @DisplayName("첫 체중 기록을 칭찬한다")
        void firstWeight() {
            PraiseSignals s = signals(List.of(), null, 2000, true, null, false, true);

            assertThat(keysOf(PraiseRules.detect(s))).contains("first:weight");
        }

        @Test
        @DisplayName("기록이 하나도 없으면 첫걸음도 없다")
        void nothingLogged() {
            PraiseSignals s = signals(List.of(), null, 2000, true, null, false, false);

            assertThat(PraiseRules.detect(s)).isEmpty();
        }
    }

    @Nested
    @DisplayName("연속 기록")
    class MealStreak {

        @Test
        @DisplayName("사흘 연속이면 칭찬한다")
        void threeDays() {
            assertThat(keysOf(PraiseRules.detect(onlyMealDays(consecutiveDays(3)))))
                    .contains("meal-streak:3");
        }

        @Test
        @DisplayName("이틀 연속으로는 칭찬하지 않는다, 첫 이정표는 사흘이다")
        void twoDays() {
            assertThat(keysOf(PraiseRules.detect(onlyMealDays(consecutiveDays(2)))))
                    .noneMatch(key -> key.startsWith("meal-streak"));
        }

        @Test
        @DisplayName("나흘 연속이면 아직 사흘 이정표다, 다음은 이레다")
        void fourDays() {
            assertThat(keysOf(PraiseRules.detect(onlyMealDays(consecutiveDays(4)))))
                    .contains("meal-streak:3");
        }

        @Test
        @DisplayName("여드레 연속이면 이레 이정표 하나만 낸다, 지난 것을 몰아주면 말풍선이 줄줄이 뜬다")
        void eightDaysGivesOnlyLatestMilestone() {
            List<String> keys = keysOf(PraiseRules.detect(onlyMealDays(consecutiveDays(8))));

            assertThat(keys).contains("meal-streak:7");
            assertThat(keys).doesNotContain("meal-streak:3");
        }

        @Test
        @DisplayName("연속이 끊기면 마지막 묶음만 센다")
        void brokenStreak() {
            // 8/10~8/12 사흘, 하루 걸러 8/14~8/19 엿새
            List<LocalDate> days = List.of(
                    LocalDate.of(2026, 8, 10), LocalDate.of(2026, 8, 11), LocalDate.of(2026, 8, 12),
                    LocalDate.of(2026, 8, 14), LocalDate.of(2026, 8, 15), LocalDate.of(2026, 8, 16),
                    LocalDate.of(2026, 8, 17), LocalDate.of(2026, 8, 18), LocalDate.of(2026, 8, 19));

            assertThat(keysOf(PraiseRules.detect(onlyMealDays(days)))).contains("meal-streak:3");
        }

        @Test
        @DisplayName("이정표는 3, 7, 14, 30, 60, 100이다")
        void milestones() {
            assertThat(keysOf(PraiseRules.detect(onlyMealDays(consecutiveDays(14))))).contains("meal-streak:14");
            assertThat(keysOf(PraiseRules.detect(onlyMealDays(consecutiveDays(30))))).contains("meal-streak:30");
            assertThat(keysOf(PraiseRules.detect(onlyMealDays(consecutiveDays(60))))).contains("meal-streak:60");
            assertThat(keysOf(PraiseRules.detect(onlyMealDays(consecutiveDays(100))))).contains("meal-streak:100");
        }
    }

    @Nested
    @DisplayName("하루 목표 달성")
    class DailyGoal {

        @Test
        @DisplayName("감량 목표면 섭취가 목표 이하일 때 칭찬한다")
        void cutUnderTarget() {
            PraiseSignals s = signals(consecutiveDays(1), 1800, 2000, true, null, true, true);

            assertThat(keysOf(PraiseRules.detect(s))).contains("daily-goal:2026-08-18");
        }

        @Test
        @DisplayName("감량 목표인데 목표를 넘겼으면 칭찬하지 않는다")
        void cutOverTarget() {
            PraiseSignals s = signals(consecutiveDays(1), 2100, 2000, true, null, true, true);

            assertThat(keysOf(PraiseRules.detect(s))).noneMatch(key -> key.startsWith("daily-goal"));
        }

        @Test
        @DisplayName("감량 목표가 아니면 10% 밴드 안이면 칭찬한다")
        void bandWithin() {
            PraiseSignals s = signals(consecutiveDays(1), 2100, 2000, false, null, true, true);

            assertThat(keysOf(PraiseRules.detect(s))).contains("daily-goal:2026-08-18");
        }

        @Test
        @DisplayName("감량 목표가 아닌데 10% 밴드를 벗어나면 칭찬하지 않는다")
        void bandOutside() {
            PraiseSignals s = signals(consecutiveDays(1), 2300, 2000, false, null, true, true);

            assertThat(keysOf(PraiseRules.detect(s))).noneMatch(key -> key.startsWith("daily-goal"));
        }

        @Test
        @DisplayName("그날 먹은 기록이 없으면 칭찬하지 않는다, 굶은 것은 목표 달성이 아니다")
        void noIntake() {
            PraiseSignals s = signals(consecutiveDays(1), null, 2000, true, null, true, true);

            assertThat(keysOf(PraiseRules.detect(s))).noneMatch(key -> key.startsWith("daily-goal"));
        }

        @Test
        @DisplayName("목표 칼로리가 없으면 판정하지 않는다")
        void noTarget() {
            PraiseSignals s = signals(consecutiveDays(1), 1800, null, true, null, true, true);

            assertThat(keysOf(PraiseRules.detect(s))).noneMatch(key -> key.startsWith("daily-goal"));
        }
    }

    @Nested
    @DisplayName("체중 추세")
    class WeightTrend {

        @Test
        @DisplayName("감량 목표 회원의 추세가 내려가면 칭찬한다")
        void cutAndFalling() {
            PraiseSignals s = signals(consecutiveDays(1), null, 2000, true, -0.4, true, true);

            assertThat(keysOf(PraiseRules.detect(s))).contains("weight-trend:2026-W34");
        }

        @Test
        @DisplayName("감량이 목표가 아니면 추세가 내려가도 칭찬하지 않는다")
        void notCut() {
            PraiseSignals s = signals(consecutiveDays(1), null, 2000, false, -0.4, true, true);

            assertThat(keysOf(PraiseRules.detect(s))).noneMatch(key -> key.startsWith("weight-trend"));
        }

        @Test
        @DisplayName("추세가 올라가면 칭찬하지 않는다")
        void rising() {
            PraiseSignals s = signals(consecutiveDays(1), null, 2000, true, 0.3, true, true);

            assertThat(keysOf(PraiseRules.detect(s))).noneMatch(key -> key.startsWith("weight-trend"));
        }

        @Test
        @DisplayName("추세가 그대로면 칭찬하지 않는다")
        void flat() {
            PraiseSignals s = signals(consecutiveDays(1), null, 2000, true, 0.0, true, true);

            assertThat(keysOf(PraiseRules.detect(s))).noneMatch(key -> key.startsWith("weight-trend"));
        }

        @Test
        @DisplayName("추세를 낼 수 없으면 칭찬하지 않는다")
        void noTrend() {
            PraiseSignals s = signals(consecutiveDays(1), null, 2000, true, null, true, true);

            assertThat(keysOf(PraiseRules.detect(s))).noneMatch(key -> key.startsWith("weight-trend"));
        }
    }

    @Nested
    @DisplayName("우선순위")
    class Priority {

        @Test
        @DisplayName("첫걸음, 연속 기록, 체중 추세, 하루 목표 순으로 정렬한다")
        void order() {
            // 넷이 한꺼번에 잡히는 상황. 첫 기록이면서 사흘 연속이고 어제 목표를 지켰고 추세도 내려갔다
            PraiseSignals s = new PraiseSignals(consecutiveDays(3), YESTERDAY, 1800, 2000, true, -0.4,
                    "2026-W34", true, true);

            List<PraiseKind> kinds = PraiseRules.detect(s).stream().map(PraiseCandidate::kind).toList();

            assertThat(kinds).containsSubsequence(
                    PraiseKind.MEAL_STREAK, PraiseKind.WEIGHT_TREND, PraiseKind.DAILY_GOAL);
            assertThat(kinds.get(0).getPriority()).isEqualTo(1);
        }
    }

    @Nested
    @DisplayName("문구 재료")
    class Facts {

        @Test
        @DisplayName("사실과 폴백 문구를 함께 낸다, 생성이 실패해도 할 말이 있어야 한다")
        void factAndFallback() {
            PraiseCandidate streak = PraiseRules.detect(onlyMealDays(consecutiveDays(7))).stream()
                    .filter(candidate -> candidate.kind() == PraiseKind.MEAL_STREAK)
                    .findFirst()
                    .orElseThrow();

            assertThat(streak.fact()).contains("7");
            assertThat(streak.fallback()).isNotBlank();
        }
    }
}
