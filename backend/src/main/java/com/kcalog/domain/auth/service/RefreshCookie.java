package com.kcalog.domain.auth.service;

import org.springframework.http.ResponseCookie;

import java.time.Duration;

/** refresh 토큰 쿠키 — HttpOnly, /api/auth 경로 한정 (다른 API 요청에는 실리지 않는다) */
public final class RefreshCookie {

    public static final String NAME = "refresh_token";

    private RefreshCookie() {
    }

    public static ResponseCookie of(String value, Duration ttl) {
        return builder(value).maxAge(ttl).build();
    }

    public static ResponseCookie expired() {
        return builder("").maxAge(0).build();
    }

    private static ResponseCookie.ResponseCookieBuilder builder(String value) {
        return ResponseCookie.from(NAME, value)
                .httpOnly(true)
                .secure(true)
                .sameSite("Lax")
                .path("/api/auth");
    }
}
