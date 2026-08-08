package com.kcalog.domain.meal.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;
import static org.springframework.http.HttpMethod.POST;

/** OpenAiClient의 응답 파싱 회귀 테스트 — 응답을 String으로 받아 content를 추출하는 경로를 고정 */
class OpenAiClientTest {

    @Test
    @DisplayName("Chat Completions 응답에서 첫 choice의 message.content를 추출한다")
    void extractsContent() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://openai.test/v1");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo("http://openai.test/v1/chat/completions"))
                .andExpect(method(POST))
                .andRespond(withSuccess("""
                        {"choices":[{"message":{"role":"assistant","content":"{\\"foodFound\\":true,\\"totalKcal\\":650}"}}]}
                        """, MediaType.APPLICATION_JSON));

        OpenAiClient client = new OpenAiClient(builder.build());
        String content = client.complete(Map.of("model", "gpt-5.4-mini"));

        assertThat(content).isEqualTo("{\"foodFound\":true,\"totalKcal\":650}");
        server.verify();
    }
}
