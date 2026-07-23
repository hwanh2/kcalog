package com.kcalog.global.common;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties(prefix = "app")
public record AppProperties(String frontendBaseUrl, Jwt jwt, RefreshToken refreshToken) {

    public record Jwt(String secret, Duration accessTokenTtl) {
    }

    public record RefreshToken(Duration ttl) {
    }
}
