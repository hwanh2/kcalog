package com.kcalog.domain.meal.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Consumer;

/** OpenAI Chat Completions 호출만 담당하는 얇은 경계 — 테스트에서 이 컴포넌트를 스텁해 HTTP를 격리한다 */
@Component
@RequiredArgsConstructor
public class OpenAiClient {

    private final RestClient openAiRestClient;
    // 응답을 String으로 받아 직접 파싱 — RestClient 기본 컨버터의 JsonNode 역직렬화 이슈를 피한다
    private final ObjectMapper objectMapper = new ObjectMapper();

    /** 요청 본문(Map)을 보내고 첫 choice의 message.content(구조화 출력 JSON 문자열)를 반환한다 */
    @SneakyThrows
    public String complete(Map<String, Object> requestBody) {
        String raw = openAiRestClient.post()
                .uri("/chat/completions")
                .body(requestBody)
                .retrieve()
                .body(String.class);
        JsonNode response = objectMapper.readTree(raw);
        return response.path("choices").path(0).path("message").path("content").asText();
    }

    /**
     * 스트리밍 호출 — SSE 델타(choices[0].delta.content)를 도착 즉시 onToken으로 흘려보내고,
     * 전체 이어붙인 텍스트를 반환한다. 응답 InputStream을 직접 읽어 `data:` 프레임을 파싱한다.
     */
    @SneakyThrows
    public String stream(Map<String, Object> requestBody, Consumer<String> onToken) {
        Map<String, Object> streamBody = new HashMap<>(requestBody);
        streamBody.put("stream", true);

        return openAiRestClient.post()
                .uri("/chat/completions")
                .body(streamBody)
                .exchange((request, response) -> {
                    if (!response.getStatusCode().is2xxSuccessful()) {
                        throw new IllegalStateException("OpenAI 스트림 오류: " + response.getStatusCode());
                    }
                    StringBuilder full = new StringBuilder();
                    try (BufferedReader reader = new BufferedReader(
                            new InputStreamReader(response.getBody(), StandardCharsets.UTF_8))) {
                        String line;
                        while ((line = reader.readLine()) != null) {
                            if (!line.startsWith("data:")) {
                                continue;
                            }
                            String data = line.substring(5).trim();
                            if (data.isEmpty() || "[DONE]".equals(data)) {
                                if ("[DONE]".equals(data)) {
                                    break;
                                }
                                continue;
                            }
                            JsonNode delta = objectMapper.readTree(data)
                                    .path("choices").path(0).path("delta").path("content");
                            if (delta.isTextual()) {
                                String piece = delta.asText();
                                if (!piece.isEmpty()) {
                                    full.append(piece);
                                    onToken.accept(piece);
                                }
                            }
                        }
                    }
                    return full.toString();
                });
    }
}
