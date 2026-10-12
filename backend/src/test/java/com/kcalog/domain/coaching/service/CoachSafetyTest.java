package com.kcalog.domain.coaching.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class CoachSafetyTest {

    private static final ModerationResult CLEAN = new ModerationResult(false, Set.of());

    @Test
    @DisplayName("검사에 걸리지 않은 평범한 식단 질문은 통과한다")
    void allowsNormalQuestion() {
        assertThat(CoachSafety.judge("오늘 단백질 부족한가?", CLEAN)).isEqualTo(SafetyVerdict.ALLOW);
    }

    @Test
    @DisplayName("검사가 자해 계열로 판정하면 위기 안전 응답")
    void selfHarmCategory() {
        ModerationResult flagged = new ModerationResult(true, Set.of("self-harm/intent"));

        assertThat(CoachSafety.judge("아무 말", flagged)).isEqualTo(SafetyVerdict.SELF_HARM);
    }

    @Test
    @DisplayName("자해와 다른 항목이 함께 걸리면 자해 쪽 응답이 우선한다")
    void selfHarmWinsOverOthers() {
        ModerationResult flagged = new ModerationResult(true, Set.of("violence", "self-harm"));

        assertThat(CoachSafety.judge("아무 말", flagged)).isEqualTo(SafetyVerdict.SELF_HARM);
    }

    @Test
    @DisplayName("자해 외의 항목으로 걸리면 거절")
    void otherCategoryRefused() {
        ModerationResult flagged = new ModerationResult(true, Set.of("illicit"));

        assertThat(CoachSafety.judge("아무 말", flagged)).isEqualTo(SafetyVerdict.REFUSE);
    }

    @ParameterizedTest
    @ValueSource(strings = {"요즘 죽고 싶어", "자해하고 싶다", "자살 생각이 나"})
    @DisplayName("검사가 놓친 한국어 자해 표현은 키워드로 잡는다")
    void selfHarmKeywords(String text) {
        assertThat(CoachSafety.judge(text, CLEAN)).isEqualTo(SafetyVerdict.SELF_HARM);
    }

    @ParameterizedTest
    @ValueSource(strings = {"먹토하면 살 안 찌지?", "먹고 토하면 괜찮아?", "설사약 먹으면 빠질까", "이뇨제로 붓기 빼도 돼?", "씹뱉 해도 돼?"})
    @DisplayName("구토, 약물로 체중을 줄이는 행동은 섭식 안전 응답")
    void disorderedEatingKeywords(String text) {
        assertThat(CoachSafety.judge(text, CLEAN)).isEqualTo(SafetyVerdict.DISORDERED_EATING);
    }

    @ParameterizedTest
    @ValueSource(strings = {"토마토 샐러드 칼로리 알려줘", "토마토하고 계란 먹었어", "아침 굶었는데 점심 뭐 먹지?", "토요일에 회식 있어"})
    @DisplayName("비슷한 글자가 들어간 평범한 질문은 걸리지 않는다")
    void noFalsePositives(String text) {
        assertThat(CoachSafety.judge(text, CLEAN)).isEqualTo(SafetyVerdict.ALLOW);
    }

    @Test
    @DisplayName("안전 응답 문구에는 상담 전화가 들어 있다")
    void safetyRepliesIncludeHotline() {
        assertThat(CoachSafety.reply(SafetyVerdict.SELF_HARM)).contains("109");
        assertThat(CoachSafety.reply(SafetyVerdict.DISORDERED_EATING)).contains("1577-0199");
    }

    @Test
    @DisplayName("코치 답은 키워드로 판정하지 않는다. 위험한 방법을 말리는 정상 답이 막히면 안 된다")
    void answerIgnoresKeywords() {
        assertThat(CoachSafety.judgeAnswer(CLEAN)).isEqualTo(SafetyVerdict.ALLOW);
    }

    @Test
    @DisplayName("코치 답이 검사에 걸리면 자해 계열은 위기 안내, 나머지는 거절로 바꾼다")
    void answerFlagged() {
        assertThat(CoachSafety.judgeAnswer(new ModerationResult(true, Set.of("self-harm/instructions"))))
                .isEqualTo(SafetyVerdict.SELF_HARM);
        assertThat(CoachSafety.judgeAnswer(new ModerationResult(true, Set.of("hate"))))
                .isEqualTo(SafetyVerdict.REFUSE);
    }
}
