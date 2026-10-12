package com.kcalog.domain.coaching.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.HashSet;
import java.util.Map;
import java.util.Set;

/**
 * OpenAI Moderation 호출 경계. 무료라 코치 대화의 질문과 답 모두에 쓴다 (add-apps-in-toss D11).
 * 실패하면 예외를 그대로 던진다. 검사 없이 대화를 이어가지 않는다(코치 쪽이 폴백 응답으로 처리한다).
 */
@Component
@RequiredArgsConstructor
public class ModerationClient {

    static final String MODEL = "omni-moderation-latest";

    private final RestClient openAiRestClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @SneakyThrows
    public ModerationResult check(String text) {
        String raw = openAiRestClient.post()
                .uri("/moderations")
                .body(Map.of("model", MODEL, "input", text))
                .retrieve()
                .body(String.class);
        JsonNode result = objectMapper.readTree(raw).path("results").path(0);
        if (result.isMissingNode()) {
            throw new IllegalStateException("Moderation 응답에 결과가 없다");
        }
        Set<String> categories = new HashSet<>();
        result.path("categories").properties().forEach(entry -> {
            if (entry.getValue().asBoolean(false)) {
                categories.add(entry.getKey());
            }
        });
        return new ModerationResult(result.path("flagged").asBoolean(false), categories);
    }
}
