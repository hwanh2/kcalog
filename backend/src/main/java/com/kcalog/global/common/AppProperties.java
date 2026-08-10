package com.kcalog.global.common;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties(prefix = "app")
public record AppProperties(String frontendBaseUrl, Jwt jwt, RefreshToken refreshToken, Openai openai, Storage storage) {

    public record Jwt(String secret, Duration accessTokenTtl) {
    }

    public record RefreshToken(Duration ttl) {
    }

    /** OpenAI 식사 분석 설정. apiKey는 환경변수 주입 필수(로컬 기본값은 placeholder) */
    public record Openai(String apiKey, String baseUrl, String model, Duration timeout, int dailyAnalysisLimit) {
    }

    /** 사진 Object Storage 설정 — S3 호환(로컬 MinIO / 운영 S3·R2). endpoint 비우면 AWS 기본.
     *  pathStyle은 MinIO·R2에 true, AWS S3에 false. retentionHours 지난 미확인 분석 사진을 정리한다. */
    public record Storage(String bucket, String endpoint, String region,
                          String accessKey, String secretKey, boolean pathStyle, int retentionHours) {
    }
}
