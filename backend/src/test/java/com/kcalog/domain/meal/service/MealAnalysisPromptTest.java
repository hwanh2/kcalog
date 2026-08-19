package com.kcalog.domain.meal.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/** 재분석 프롬프트에 직전 추정과 설명 전부가 실리는지. 최초 분석 프롬프트는 그대로여야 한다(eval 유효). */
@DisplayName("분석 프롬프트")
class MealAnalysisPromptTest {

    private static final List<MealAnalysisPrompt.PreviousItem> PREVIOUS = List.of(
            new MealAnalysisPrompt.PreviousItem("흰쌀밥", "210g", 300, "66", "5", "1"),
            new MealAnalysisPrompt.PreviousItem("김치찌개", "1인분", 400, "12", "20", "28"));

    /** user 메시지의 텍스트 조각을 이어 붙인다. 조각이 몇 개로 나뉘든 내용으로 검증한다 */
    @SuppressWarnings("unchecked")
    private static String userText(Map<String, Object> body) {
        List<Map<String, Object>> messages = (List<Map<String, Object>>) body.get("messages");
        Map<String, Object> user = messages.get(1);
        StringBuilder sb = new StringBuilder();
        for (Map<String, Object> part : (List<Map<String, Object>>) user.get("content")) {
            if ("text".equals(part.get("type"))) {
                sb.append(part.get("text")).append('\n');
            }
        }
        return sb.toString();
    }

    @Test
    @DisplayName("직전 추정을 항목별 한 줄로 싣는다")
    void includesPreviousEstimate() {
        String text = userText(MealAnalysisPrompt.requestBody(
                "model", "data:image/jpeg;base64,x", List.of("밥 양 더 줄었어"), List.of(), PREVIOUS));

        assertThat(text).contains("흰쌀밥 210g: 300kcal, 탄 66g, 단 5g, 지 1g");
        assertThat(text).contains("김치찌개 1인분: 400kcal");
    }

    @Test
    @DisplayName("언급되지 않은 항목은 그대로 두라고 지시한다, 없으면 손대지 않은 항목이 흔들린다")
    void tellsToKeepUnmentioned() {
        String text = userText(MealAnalysisPrompt.requestBody(
                "model", "data:image/jpeg;base64,x", List.of("밥 양 더 줄었어"), List.of(), PREVIOUS));

        assertThat(text).contains("언급되지 않은 항목은 직전 값을 그대로 두세요");
    }

    @Test
    @DisplayName("덧붙인 설명을 모두 싣는다")
    void includesAllNotes() {
        String text = userText(MealAnalysisPrompt.requestBody(
                "model", "data:image/jpeg;base64,x",
                List.of("고기는 뺐어", "밥도 적어"), List.of(), PREVIOUS));

        assertThat(text).contains("고기는 뺐어");
        assertThat(text).contains("밥도 적어");
    }

    @Test
    @DisplayName("설명이 사용자 설명 자리에 온다, 직전 추정보다 뒤여야 방금 한 말이 이긴다")
    void notesComeAfterPreviousEstimate() {
        String text = userText(MealAnalysisPrompt.requestBody(
                "model", "data:image/jpeg;base64,x", List.of("밥 양 더 줄었어"), List.of(), PREVIOUS));

        assertThat(text.indexOf("직전 추정")).isLessThan(text.indexOf("밥 양 더 줄었어"));
    }

    @Test
    @DisplayName("최초 분석은 직전 추정 없이 예전과 같은 프롬프트다")
    void firstAnalysisUnchanged() {
        String text = userText(MealAnalysisPrompt.requestBody(
                "model", "data:image/jpeg;base64,x", List.of("처음 설명"), List.of(), List.of()));

        assertThat(text).doesNotContain("직전 추정");
        assertThat(text).contains("사용자 설명(사진에 보이지 않는 정보이니 추정에 반드시 반영하세요): 처음 설명");
    }

    @Test
    @DisplayName("설명이 없으면 설명 자리를 만들지 않는다")
    void noNotes() {
        String text = userText(MealAnalysisPrompt.requestBody(
                "model", "data:image/jpeg;base64,x", List.of(), List.of(), List.of()));

        assertThat(text).doesNotContain("사용자 설명");
    }

    @Test
    @DisplayName("설명만 분석에도 직전 추정이 실린다")
    void textOnlyWithPrevious() {
        String text = userText(MealAnalysisPrompt.textRequestBody(
                "model", List.of("어제 먹은 것", "밥은 반 공기"), List.of(), PREVIOUS));

        assertThat(text).contains("직전 추정");
        assertThat(text).contains("밥은 반 공기");
    }

    @Test
    @DisplayName("설명만 분석도 사진 분석과 같은 순서다 — 직전 추정이 사용자 설명보다 앞")
    void textOnlyKeepsSameOrder() {
        String text = userText(MealAnalysisPrompt.textRequestBody(
                "model", List.of("밥은 반 공기"), List.of(), PREVIOUS));

        assertThat(text.indexOf("직전 추정")).isLessThan(text.indexOf("밥은 반 공기"));
    }
}
