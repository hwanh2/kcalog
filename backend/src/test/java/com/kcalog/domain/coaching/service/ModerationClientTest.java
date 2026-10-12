package com.kcalog.domain.coaching.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.http.HttpMethod.POST;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.content;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class ModerationClientTest {

    private static final String URL = "http://openai.test/v1/moderations";

    @Test
    @DisplayName("걸린 항목만 골라 담고, 모델과 입력을 본문에 싣는다")
    void parsesFlaggedCategories() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://openai.test/v1");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo(URL)).andExpect(method(POST))
                .andExpect(content().json("{\"model\":\"omni-moderation-latest\",\"input\":\"질문\"}"))
                .andRespond(withSuccess("""
                        {"results":[{"flagged":true,"categories":{"self-harm":true,"violence":false,"self-harm/intent":true}}]}
                        """, MediaType.APPLICATION_JSON));

        ModerationResult result = new ModerationClient(builder.build()).check("질문");

        assertThat(result.flagged()).isTrue();
        assertThat(result.categories()).containsExactlyInAnyOrder("self-harm", "self-harm/intent");
        server.verify();
    }

    @Test
    @DisplayName("검사 호출이 실패하면 예외를 던진다. 검사 없이 대화를 이어가지 않는다")
    void failsClosed() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://openai.test/v1");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        server.expect(requestTo(URL)).andRespond(withServerError());

        assertThatThrownBy(() -> new ModerationClient(builder.build()).check("질문"))
                .isInstanceOf(RuntimeException.class);
    }
}
