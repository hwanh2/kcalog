package com.kcalog.domain.auth.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.kcalog.domain.auth.exception.AppsInTossUnavailableException;
import com.kcalog.domain.auth.exception.InvalidTossAuthCodeException;
import org.springframework.http.MediaType;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.io.IOException;
import java.util.Map;

/** 앱인토스 파트너 API 중 익명 키 교환만 다루는 경계. 테스트에서 이 클래스를 스텁해 mTLS 호출을 격리한다. */
public class AppsInTossClient {

    static final String EXCHANGE_PATH = "/api-partner/v1/apps-in-toss/users/anon-key/exchange";

    /** 코드 만료, 재사용. 이것만 사용자 쪽 문제이고 나머지 실패(한도 초과 4095 포함)는 우리 쪽에서 재시도할 일이다. */
    private static final String INVALID_CODE = "4011";

    private final RestClient restClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public AppsInTossClient(RestClient restClient) {
        this.restClient = restClient;
    }

    public static AppsInTossClient disabled() {
        return new AppsInTossClient(null);
    }

    public String exchangeAnonKey(String code) {
        if (restClient == null) {
            throw new AppsInTossUnavailableException("앱인토스 인증서가 설정되지 않았다", null);
        }
        String raw;
        try {
            raw = restClient.post()
                    .uri(EXCHANGE_PATH)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(Map.of("code", code))
                    .retrieve()
                    .body(String.class);
        } catch (RestClientException e) {
            throw new AppsInTossUnavailableException("앱인토스 익명 키 교환 호출 실패", e);
        }

        // 비즈니스 오류도 HTTP 200으로 오므로 상태 코드가 아니라 resultType으로 판정한다
        JsonNode root = parse(raw);
        String resultType = root.path("resultType").asText();
        if ("SUCCESS".equals(resultType)) {
            String anonKey = root.path("success").path("anonKey").asText("");
            if (anonKey.isBlank()) {
                throw new AppsInTossUnavailableException("앱인토스 응답에 anonKey가 없다", null);
            }
            return anonKey;
        }
        String errorCode = root.path("error").path("errorCode").asText();
        if (INVALID_CODE.equals(errorCode)) {
            throw new InvalidTossAuthCodeException();
        }
        throw new AppsInTossUnavailableException(
                "앱인토스 익명 키 교환 실패: resultType=" + resultType + ", errorCode=" + errorCode, null);
    }

    private JsonNode parse(String raw) {
        try {
            return objectMapper.readTree(raw == null ? "" : raw);
        } catch (IOException e) {
            throw new AppsInTossUnavailableException("앱인토스 응답을 읽을 수 없다", e);
        }
    }
}
