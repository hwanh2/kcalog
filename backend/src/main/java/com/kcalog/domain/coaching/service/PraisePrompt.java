package com.kcalog.domain.coaching.service;

import java.util.List;
import java.util.Map;

/**
 * 칭찬 문구 요청 본문. 페르소나는 브리핑, 채팅과 공유해 코치의 말투가 갈라지지 않게 한다(design D1).
 * 사실은 규칙이 판정해 넘기고 LLM은 그것을 한 문장으로 옮기기만 한다.
 */
final class PraisePrompt {

    private static final String INSTRUCTION = """
            아래 '사실'을 근거로 회원을 칭찬하는 말 한마디를 써 주세요.

            - 한 문장, 30자 내외. 말풍선에 들어가는 짧은 말입니다.
            - 밝게 기뻐하되 호들갑스럽지 않게. 사실을 먼저 말하고 한마디 덧붙이는 식으로 씁니다.
            - 이모지를 쓰지 않습니다. 느낌표도 쓰지 않습니다.
            - 사실에 없는 수치나 내용을 지어내지 않습니다.
            - 따옴표 없이 문장만 출력합니다.

            예시: "3일 연속이에요. 잘하고 있어요" / "어제 목표 안에서 마무리했어요"
            """;

    static Map<String, Object> body(String model, String fact) {
        return Map.of(
                "model", model,
                "messages", List.of(
                        Map.of("role", "system", "content", CoachingPrompt.PERSONA),
                        Map.of("role", "user", "content", "사실: " + fact + "\n\n" + INSTRUCTION)));
    }

    private PraisePrompt() {
    }
}
