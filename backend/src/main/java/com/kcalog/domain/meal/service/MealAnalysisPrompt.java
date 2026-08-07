package com.kcalog.domain.meal.service;

import java.util.List;
import java.util.Map;

/** OpenAI 요청 본문(구조화 출력 스키마·프롬프트) 구성 — 한식 총량 영양 분석 */
final class MealAnalysisPrompt {

    static final String SYSTEM = """
            당신은 음식 영양 분석 전문가입니다. 사진 속 음식 전체의 총 영양을 추정하세요.
            한식·양식·중식·일식, 가정식·외식·배달·프랜차이즈 등 어떤 음식이든 다룰 수 있으며,
            일반적인 1인분 기준으로 추정합니다. 국물·소스가 있으면 섭취량을 보수적으로 봅니다.
            음식이 없으면 foodFound=false로 응답하세요.
            개별 음식으로 나누지 말고 사진 전체의 합계(총 칼로리·탄수화물·단백질·지방)만 냅니다.
            """;

    /** 구조화 출력 스키마 — strict json_schema */
    static Map<String, Object> responseFormat() {
        return Map.of(
                "type", "json_schema",
                "json_schema", Map.of(
                        "name", "meal_nutrition",
                        "strict", true,
                        "schema", Map.of(
                                "type", "object",
                                "additionalProperties", false,
                                "required", List.of("foodFound", "totalKcal", "carbG", "proteinG", "fatG", "confidence", "notes"),
                                "properties", Map.of(
                                        "foodFound", Map.of("type", "boolean", "description", "음식이 식별되면 true"),
                                        "totalKcal", Map.of("type", "integer", "description", "총 칼로리(kcal)"),
                                        "carbG", Map.of("type", "number", "description", "총 탄수화물(g)"),
                                        "proteinG", Map.of("type", "number", "description", "총 단백질(g)"),
                                        "fatG", Map.of("type", "number", "description", "총 지방(g)"),
                                        "confidence", Map.of("type", "number", "description", "추정 신뢰도 0~1"),
                                        "notes", Map.of("type", "string", "description", "사용자 안내(음식 미검출 사유 등)")))));
    }

    static Map<String, Object> requestBody(String model, String imageDataUrl) {
        var userContent = List.of(
                Map.of("type", "text", "text", "이 사진 속 음식의 총 영양을 추정해 주세요."),
                Map.of("type", "image_url", "image_url", Map.of("url", imageDataUrl)));
        return Map.of(
                "model", model,
                "messages", List.of(
                        Map.of("role", "system", "content", SYSTEM),
                        Map.of("role", "user", "content", userContent)),
                "response_format", responseFormat());
    }

    private MealAnalysisPrompt() {
    }
}
