package com.kcalog.domain.coaching.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * 코칭 OpenAI 요청 본문 구성 — 브리핑(구조화 출력)과 채팅(자연어). 숫자는 프롬프트로 주입,
 * LLM은 서술만. 신호에 없는 수치는 지어내지 말라고 명시해 환각·오수치를 막는다.
 */
final class CoachingPrompt {

    static final String PERSONA = """
            당신은 사용자의 식단·체중 데이터를 함께 보는 다정하고 현실적인 AI 영양 코치입니다.
            반드시 한국어로, 친근하지만 간결하게 말합니다. 아래 '회원 데이터'에 있는 숫자만 근거로 쓰고,
            데이터에 없는 수치나 사실을 지어내지 않습니다. 의학적 진단·단정은 하지 않고 일반적인 식단 조언에 한정합니다.
            부족한 점이 있어도 비난하지 않고, 오늘 실천할 수 있는 구체적 행동을 제안합니다.
            """;

    private static final String BRIEFING_INSTRUCTION = """
            위 회원 데이터를 바탕으로 '오늘의 브리핑'을 만들어 주세요.
            - headline: 오늘 상태를 한 문장으로 요약(20자 내외, 격려 톤)
            - message: 2~3문장으로 최근 흐름과 오늘 초점을 짚어주는 코칭
            - recommendations: 오늘의 추천 2~3개. 각 항목은
              category(meal=식단/activity=활동/hydration=수분/habit=습관 중 하나),
              title(짧은 제목 12자 내외), detail(한 줄 설명 30자 내외).
              활동·수분처럼 우리가 추적하지 않는 항목은 일반적 제안으로 쓰고, 데이터에 없는 수치는 지어내지 마세요.
            """;

    /** 브리핑 구조화 출력 스키마 — strict json_schema */
    private static Map<String, Object> briefingResponseFormat() {
        Map<String, Object> recommendation = Map.of(
                "type", "object",
                "additionalProperties", false,
                "required", List.of("category", "title", "detail"),
                "properties", Map.of(
                        "category", Map.of(
                                "type", "string",
                                "enum", List.of("meal", "activity", "hydration", "habit"),
                                "description", "추천 분류"),
                        "title", Map.of("type", "string", "description", "짧은 제목"),
                        "detail", Map.of("type", "string", "description", "한 줄 설명")));
        return Map.of(
                "type", "json_schema",
                "json_schema", Map.of(
                        "name", "coaching_briefing",
                        "strict", true,
                        "schema", Map.of(
                                "type", "object",
                                "additionalProperties", false,
                                "required", List.of("headline", "message", "recommendations"),
                                "properties", Map.of(
                                        "headline", Map.of("type", "string", "description", "오늘 상태 한 문장 요약"),
                                        "message", Map.of("type", "string", "description", "2~3문장 코칭"),
                                        "recommendations", Map.of(
                                                "type", "array",
                                                "items", recommendation,
                                                "description", "오늘의 추천 2~3개")))));
    }

    static Map<String, Object> briefingBody(String model, String signalsJson) {
        return Map.of(
                "model", model,
                "messages", List.of(
                        Map.of("role", "system", "content", PERSONA),
                        Map.of("role", "user", "content", "회원 데이터(JSON):\n" + signalsJson + "\n\n" + BRIEFING_INSTRUCTION)),
                "response_format", briefingResponseFormat());
    }

    static Map<String, Object> chatBody(String model, String signalsJson, List<ChatTurn> history, String question) {
        var messages = new ArrayList<Map<String, Object>>();
        messages.add(Map.of("role", "system", "content",
                PERSONA + "\n\n회원 데이터(JSON):\n" + signalsJson
                        + "\n\n이 데이터를 근거로 사용자의 질문에 답하세요. 답은 3문장 이내로 간결하게."));
        for (ChatTurn t : history) {
            messages.add(Map.of("role", t.role(), "content", t.content()));
        }
        messages.add(Map.of("role", "user", "content", question));
        return Map.of("model", model, "messages", messages);
    }

    private CoachingPrompt() {
    }
}
