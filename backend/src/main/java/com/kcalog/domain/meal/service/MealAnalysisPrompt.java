package com.kcalog.domain.meal.service;

import com.kcalog.domain.correction.dto.PersonalCorrection;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * OpenAI 요청 본문(구조화 출력 스키마·프롬프트) 구성 — 음식별 항목 분석(이름·섭취량·영양·위치 박스).
 * 입력은 사진·설명 중 하나 또는 둘 다. 사진이 없으면 위치 박스를 요구하지 않는다(그릴 대상이 없다).
 */
final class MealAnalysisPrompt {

    static final String SYSTEM = """
            당신은 음식 영양 분석 전문가입니다. 사진 속 음식을 개별 항목으로 나누어 각각의 영양을 추정하세요.
            한식·양식·중식·일식, 가정식·외식·배달·프랜차이즈 등 어떤 음식이든 다룰 수 있으며,
            보이는 양을 기준으로 1인분 상식에 맞게 추정합니다. 국물·소스가 있으면 섭취량을 보수적으로 봅니다.
            각 항목마다 섭취량을 amount(숫자)와 unit(단위 문자열: g, ml, 개, 공기, 조각 등)으로 채웁니다.
            영양값(kcal·탄단지)은 그 섭취량 전체에 해당하는 총량입니다.
            각 항목마다 위치 박스(box)를 이미지 정규화 좌표(0~1)로 채웁니다:
            x,y는 박스 좌상단, w,h는 폭·높이이며 0~1 범위입니다(사진 크기와 무관). 위치가 불확실하면 최선의 추정치를 넣습니다.
            합계는 클라이언트가 항목 합으로 계산하므로 총량 필드는 두지 않습니다.
            음식이 없으면 foodFound=false, items는 빈 배열로 응답하고 notes에 사유를 적으세요.
            overallConfidence는 항목 인식·위치 추정 전반의 신뢰도(0~1)입니다.
            """;

    /** 사진 없이 설명만 분석할 때 — 위치 박스를 요구하지 않고, 설명에 없는 정보는 상식으로 보수적으로 추정한다 */
    static final String SYSTEM_TEXT_ONLY = """
            당신은 음식 영양 분석 전문가입니다. 사용자가 글로 설명한 식사를 개별 항목으로 나누어 각각의 영양을 추정하세요.
            한식·양식·중식·일식, 가정식·외식·배달·프랜차이즈 등 어떤 음식이든 다룰 수 있습니다.
            각 항목마다 섭취량을 amount(숫자)와 unit(단위 문자열: g, ml, 개, 공기, 조각 등)으로 채웁니다.
            설명에 양이 없으면 1인분 상식으로 추정하고, 국물·소스가 있으면 섭취량을 보수적으로 봅니다.
            영양값(kcal·탄단지)은 그 섭취량 전체에 해당하는 총량입니다.
            음식으로 볼 수 없는 설명이면 foodFound=false, items는 빈 배열로 응답하고 notes에 사유를 적으세요.
            overallConfidence는 설명의 구체성에 따른 추정 신뢰도(0~1)입니다 — 양이 명시되지 않았으면 낮게 잡습니다.
            """;

    /** 구조화 출력 스키마 — strict json_schema. 항목 배열 + 섭취량 + (사진이 있을 때만) 위치 박스 */
    static Map<String, Object> responseFormat(boolean withBox) {
        Map<String, Object> box = Map.of(
                "type", "object",
                "additionalProperties", false,
                "required", List.of("x", "y", "w", "h"),
                "properties", Map.of(
                        "x", Map.of("type", "number", "description", "박스 좌상단 x (0~1)"),
                        "y", Map.of("type", "number", "description", "박스 좌상단 y (0~1)"),
                        "w", Map.of("type", "number", "description", "박스 폭 (0~1)"),
                        "h", Map.of("type", "number", "description", "박스 높이 (0~1)")));

        // strict 모드는 properties의 모든 키가 required여야 하므로, 박스 유무에 따라 두 집합을 따로 만든다
        Map<String, Object> itemProperties = new LinkedHashMap<>(Map.of(
                "name", Map.of("type", "string", "description", "음식 이름"),
                "amount", Map.of("type", "number", "description", "섭취량 수치(예: 180)"),
                "unit", Map.of("type", "string", "description", "섭취량 단위(g·ml·개·공기 등)"),
                "kcal", Map.of("type", "integer", "description", "이 섭취량 전체의 칼로리(kcal)"),
                "carbG", Map.of("type", "number", "description", "탄수화물(g)"),
                "proteinG", Map.of("type", "number", "description", "단백질(g)"),
                "fatG", Map.of("type", "number", "description", "지방(g)")));
        List<String> itemRequired = new ArrayList<>(
                List.of("name", "amount", "unit", "kcal", "carbG", "proteinG", "fatG"));
        if (withBox) {
            itemProperties.put("box", box);
            itemRequired.add("box");
        }

        Map<String, Object> item = Map.of(
                "type", "object",
                "additionalProperties", false,
                "required", itemRequired,
                "properties", itemProperties);
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

    /**
     * 사진 분석. 재분석이면 직전 추정과 지금까지의 설명이 함께 실린다.
     * <p>
     * 참고 자료 순서는 개인 보정, 직전 추정, 사용자 설명이다. 뒤에 올수록 이번 요청에 가깝고,
     * 충돌하면 사용자가 방금 한 말이 이겨야 한다(design D5).
     */
    static Map<String, Object> requestBody(String model, String imageDataUrl, List<String> notes,
                                           List<PersonalCorrection> corrections, List<PreviousItem> previous) {
        var userContent = new ArrayList<Map<String, Object>>();
        userContent.add(Map.of("type", "text", "text",
                "이 사진 속 음식을 항목별로 나누어 각각의 섭취량·영양·위치를 추정해 주세요."));
        addIfPresent(userContent, personalHistory(corrections));
        addIfPresent(userContent, previousEstimate(previous));
        addIfPresent(userContent, userNotes(notes));
        userContent.add(Map.of("type", "image_url", "image_url", Map.of("url", imageDataUrl)));
        return body(model, SYSTEM, userContent, true);
    }

    /** 설명만 분석 — 사진이 없으므로 위치 박스를 요구하지 않는다 */
    static Map<String, Object> textRequestBody(String model, List<String> notes,
                                               List<PersonalCorrection> corrections, List<PreviousItem> previous) {
        var userContent = new ArrayList<Map<String, Object>>();
        userContent.add(Map.of("type", "text", "text",
                "다음 식사 설명을 항목별로 나누어 각각의 섭취량·영양을 추정해 주세요.\n" + String.join("\n", notes)));
        addIfPresent(userContent, personalHistory(corrections));
        addIfPresent(userContent, previousEstimate(previous));
        return body(model, SYSTEM_TEXT_ONLY, userContent, false);
    }

    /** 직전 회차의 항목 하나 — 프롬프트에 넣을 값만 추린다(위치 박스와 내부 플래그는 뺀다) */
    record PreviousItem(String name, String amount, int kcal, String carbG, String proteinG, String fatG) {
    }

    /**
     * 직전 추정. 저장된 JSON을 그대로 넣지 않고 항목별 한 줄로 푼다. 모델이 고쳐야 할 것은
     * 이름·양·영양값이지 좌표가 아니다(design D3).
     * <p>
     * "언급되지 않은 항목은 그대로 두세요"가 핵심이다. 이 문장이 없으면 밥 이야기를 했는데
     * 국의 값까지 바뀌어, 회차를 거듭할수록 손대지 않은 항목이 흔들린다.
     */
    private static String previousEstimate(List<PreviousItem> previous) {
        if (previous == null || previous.isEmpty()) {
            return "";
        }
        StringBuilder sb = new StringBuilder(
                "직전 추정입니다. 아래 사용자 설명을 반영해 이 값을 고치되, "
                        + "설명에서 언급되지 않은 항목은 직전 값을 그대로 두세요.\n");
        for (PreviousItem item : previous) {
            sb.append("- %s %s: %dkcal, 탄 %sg, 단 %sg, 지 %sg%n"
                    .formatted(item.name(), item.amount(), item.kcal(),
                            item.carbG(), item.proteinG(), item.fatG()));
        }
        return sb.toString();
    }

    private static Map<String, Object> body(String model, String system, List<Map<String, Object>> userContent,
                                            boolean withBox) {
        return Map.of(
                "model", model,
                "messages", List.of(
                        Map.of("role", "system", "content", system),
                        Map.of("role", "user", "content", userContent)),
                "response_format", responseFormat(withBox));
    }

    private static void addIfPresent(List<Map<String, Object>> userContent, String text) {
        if (!text.isEmpty()) {
            userContent.add(Map.of("type", "text", "text", text));
        }
    }

    /**
     * 사진에 보이지 않는 정보(조리법·섭취량·제외한 재료)를 사용자가 적은 설명.
     * 재분석마다 덧붙은 것을 모두 넘긴다. 최신 것만 주면 모델이 흘린 지시가 영영 사라진다(design D2).
     */
    private static String userNotes(List<String> notes) {
        if (notes == null || notes.isEmpty()) {
            return "";
        }
        if (notes.size() == 1) {
            return "사용자 설명(사진에 보이지 않는 정보이니 추정에 반드시 반영하세요): " + notes.getFirst();
        }
        StringBuilder sb = new StringBuilder(
                "사용자 설명(사진에 보이지 않는 정보이니 추정에 반드시 반영하세요. 적은 순서대로입니다):\n");
        for (String note : notes) {
            sb.append("- ").append(note).append('\n');
        }
        return sb.toString();
    }

    /**
     * 개인 보정 이력 주입(B) — 사용자가 과거에 정정한 음식·영양값을 참고 자료로 제공한다.
     * 이력이 비면 빈 문자열(프롬프트가 기존과 동일해져 eval 세트가 그대로 유효). 정확 재현은 코드 덮어쓰기(A)가 보장.
     */
    private static String personalHistory(List<PersonalCorrection> corrections) {
        if (corrections == null || corrections.isEmpty()) {
            return "";
        }
        StringBuilder sb = new StringBuilder(
                "참고: 이 사용자가 직접 정정한 음식별 영양값입니다. 같은/유사한 음식이 보이면 이 값을 우선 반영해 추정하세요.\n"
                        + "괄호 안은 그 값의 기준 섭취량이며, 양이 다르면 비례해 조정하세요.\n");
        for (PersonalCorrection c : corrections) {
            sb.append("- %s%s: %dkcal, 탄 %sg, 단 %sg, 지 %sg%n"
                    .formatted(c.displayName(), basis(c), c.kcal(), c.carbG(), c.proteinG(), c.fatG()));
        }
        return sb.toString();
    }

    /** 보정치의 기준 섭취량 표기 — 모르면 생략한다(예전에 수량 없이 저장된 값) */
    private static String basis(PersonalCorrection c) {
        if (c.baseQuantity() == null || c.unit() == null || c.unit().isBlank()) {
            return "";
        }
        return "(%s%s 기준)".formatted(c.baseQuantity().stripTrailingZeros().toPlainString(), c.unit());
    }

    private MealAnalysisPrompt() {
    }
}
