package com.kcalog.domain.auth.service;

import com.kcalog.domain.auth.exception.AppsInTossUnavailableException;
import com.kcalog.domain.auth.exception.InvalidTossAuthCodeException;
import org.junit.jupiter.api.BeforeEach;
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

class AppsInTossClientTest {

    static final String URL = "http://toss.test" + AppsInTossClient.EXCHANGE_PATH;

    MockRestServiceServer server;
    AppsInTossClient client;

    @BeforeEach
    void setUp() {
        RestClient.Builder builder = RestClient.builder().baseUrl("http://toss.test");
        server = MockRestServiceServer.bindTo(builder).build();
        client = new AppsInTossClient(builder.build());
    }

    private void respond(String body) {
        server.expect(requestTo(URL)).andExpect(method(POST))
                .andRespond(withSuccess(body, MediaType.APPLICATION_JSON));
    }

    @Test
    @DisplayName("성공 응답이면 인가 코드를 본문에 실어 보내고 anonKey를 돌려준다")
    void exchangesCode() {
        server.expect(requestTo(URL)).andExpect(method(POST))
                .andExpect(content().json("{\"code\":\"auth-code\"}"))
                .andRespond(withSuccess("""
                        {"resultType":"SUCCESS","success":{"anonKey":"anon-123"}}
                        """, MediaType.APPLICATION_JSON));

        assertThat(client.exchangeAnonKey("auth-code")).isEqualTo("anon-123");
        server.verify();
    }

    @Test
    @DisplayName("HTTP 200이어도 errorCode 4011이면 코드 무효로 본다")
    void invalidCode() {
        respond("""
                {"resultType":"FAIL","success":null,"error":{"errorCode":"4011","reason":"invalid"}}
                """);

        assertThatThrownBy(() -> client.exchangeAnonKey("used-code"))
                .isInstanceOf(InvalidTossAuthCodeException.class);
    }

    @Test
    @DisplayName("요청 한도 초과(4095)는 코드 무효가 아니라 일시 장애로 본다")
    void rateLimited() {
        respond("""
                {"resultType":"FAIL","success":null,"error":{"errorCode":"4095","reason":"limit","data":{"retryAfterSeconds":3}}}
                """);

        assertThatThrownBy(() -> client.exchangeAnonKey("code"))
                .isInstanceOf(AppsInTossUnavailableException.class);
    }

    @Test
    @DisplayName("5xx 응답은 일시 장애로 본다")
    void serverError() {
        server.expect(requestTo(URL)).andRespond(withServerError());

        assertThatThrownBy(() -> client.exchangeAnonKey("code"))
                .isInstanceOf(AppsInTossUnavailableException.class);
    }

    @Test
    @DisplayName("성공인데 anonKey가 비어 있으면 일시 장애로 본다")
    void missingAnonKey() {
        respond("""
                {"resultType":"SUCCESS","success":{}}
                """);

        assertThatThrownBy(() -> client.exchangeAnonKey("code"))
                .isInstanceOf(AppsInTossUnavailableException.class);
    }

    @Test
    @DisplayName("인증서가 없어 꺼진 클라이언트는 호출 없이 일시 장애로 답한다")
    void disabled() {
        assertThatThrownBy(() -> AppsInTossClient.disabled().exchangeAnonKey("code"))
                .isInstanceOf(AppsInTossUnavailableException.class);
    }
}
