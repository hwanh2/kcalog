package com.kcalog.global.common;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties(prefix = "app")
public record AppProperties(String frontendBaseUrl, Jwt jwt, RefreshToken refreshToken, Openai openai) {

    public record Jwt(String secret, Duration accessTokenTtl) {
    }

    public record RefreshToken(Duration ttl) {
    }

    /** OpenAI 식사 분석 설정. apiKey는 환경변수 주입 필수(로컬 기본값은 placeholder) */
    public record Openai(String apiKey, String baseUrl, String model, Duration timeout, int dailyAnalysisLimit) {
    }
}
