package com.kcalog.domain.meal.service;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Map;

/** OpenAI Chat Completions 호출만 담당하는 얇은 경계 — 테스트에서 이 컴포넌트를 스텁해 HTTP를 격리한다 */
@Component
@RequiredArgsConstructor
public class OpenAiClient {

    private final RestClient openAiRestClient;

    /** 요청 본문(Map)을 보내고 첫 choice의 message.content(구조화 출력 JSON 문자열)를 반환한다 */
    public String complete(Map<String, Object> requestBody) {
        JsonNode response = openAiRestClient.post()
                .uri("/chat/completions")
                .body(requestBody)
                .retrieve()
                .body(JsonNode.class);
        return response.path("choices").path(0).path("message").path("content").asText();
    }
}
