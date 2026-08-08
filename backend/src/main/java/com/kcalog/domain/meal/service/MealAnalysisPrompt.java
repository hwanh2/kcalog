package com.kcalog.domain.meal.service;

import java.util.List;
import java.util.Map;

/** OpenAI 요청 본문(구조화 출력 스키마·프롬프트) 구성 — 음식별 항목 분석(이름·영양·위치 박스) */
final class MealAnalysisPrompt {

    static final String SYSTEM = """
            당신은 음식 영양 분석 전문가입니다. 사진 속 음식을 개별 항목으로 나누어 각각의 영양을 추정하세요.
            한식·양식·중식·일식, 가정식·외식·배달·프랜차이즈 등 어떤 음식이든 다룰 수 있으며,
            보이는 양을 기준으로 1인분 상식에 맞게 추정합니다. 국물·소스가 있으면 섭취량을 보수적으로 봅니다.
            각 항목마다 위치 박스(box)를 이미지 정규화 좌표(0~1)로 채웁니다:
            x,y는 박스 좌상단, w,h는 폭·높이이며 0~1 범위입니다(사진 크기와 무관). 위치가 불확실하면 최선의 추정치를 넣습니다.
            합계는 클라이언트가 항목 합으로 계산하므로 총량 필드는 두지 않습니다.
            음식이 없으면 foodFound=false, items는 빈 배열로 응답하고 notes에 사유를 적으세요.
            overallConfidence는 항목 인식·위치 추정 전반의 신뢰도(0~1)입니다.
            """;

    /** 구조화 출력 스키마 — strict json_schema. 항목 배열 + 각 항목의 위치 박스(정규화) */
    static Map<String, Object> responseFormat() {
        Map<String, Object> box = Map.of(
                "type", "object",
                "additionalProperties", false,
                "required", List.of("x", "y", "w", "h"),
                "properties", Map.of(
                        "x", Map.of("type", "number", "description", "박스 좌상단 x (0~1)"),
                        "y", Map.of("type", "number", "description", "박스 좌상단 y (0~1)"),
                        "w", Map.of("type", "number", "description", "박스 폭 (0~1)"),
                        "h", Map.of("type", "number", "description", "박스 높이 (0~1)")));
        Map<String, Object> item = Map.of(
                "type", "object",
                "additionalProperties", false,
                "required", List.of("name", "kcal", "carbG", "proteinG", "fatG", "box"),
                "properties", Map.of(
                        "name", Map.of("type", "string", "description", "음식 이름"),
                        "kcal", Map.of("type", "integer", "description", "이 항목 칼로리(kcal)"),
                        "carbG", Map.of("type", "number", "description", "탄수화물(g)"),
                        "proteinG", Map.of("type", "number", "description", "단백질(g)"),
                        "fatG", Map.of("type", "number", "description", "지방(g)"),
                        "box", box));
        return Map.of(
                "type", "json_schema",
                "json_schema", Map.of(
                        "name", "meal_items",
                        "strict", true,
                        "schema", Map.of(
                                "type", "object",
                                "additionalProperties", false,
                                "required", List.of("foodFound", "items", "overallConfidence", "notes"),
                                "properties", Map.of(
                                        "foodFound", Map.of("type", "boolean", "description", "음식이 하나 이상 식별되면 true"),
                                        "items", Map.of("type", "array", "items", item, "description", "음식 항목 배열(미검출 시 빈 배열)"),
                                        "overallConfidence", Map.of("type", "number", "description", "전반 추정 신뢰도 0~1"),
                                        "notes", Map.of("type", "string", "description", "사용자 안내(음식 미검출 사유 등)")))));
    }

    static Map<String, Object> requestBody(String model, String imageDataUrl) {
        var userContent = List.of(
                Map.of("type", "text", "text", "이 사진 속 음식을 항목별로 나누어 각각의 영양과 위치를 추정해 주세요."),
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
