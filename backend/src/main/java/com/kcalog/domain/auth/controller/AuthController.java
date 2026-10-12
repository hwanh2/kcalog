package com.kcalog.domain.auth.controller;

import com.kcalog.domain.auth.dto.TokenResponse;
import com.kcalog.domain.auth.dto.TossLoginRequest;
import com.kcalog.domain.auth.exception.InvalidRefreshTokenException;
import com.kcalog.domain.auth.service.JwtService;
import com.kcalog.domain.auth.service.RefreshCookie;
import com.kcalog.domain.auth.service.RefreshTokenService;
import com.kcalog.domain.auth.service.TossAuthService;
import com.kcalog.global.common.AppProperties;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final RefreshTokenService refreshTokenService;
    private final JwtService jwtService;
    private final AppProperties props;
    private final TossAuthService tossAuthService;

    @PostMapping("/refresh")
    public ResponseEntity<TokenResponse> refresh(
            @CookieValue(name = RefreshCookie.NAME, required = false) String refreshToken,
            HttpServletResponse response) {
        if (refreshToken == null) {
            return unauthorized(response);
        }
        try {
            RefreshTokenService.IssuedToken rotated = refreshTokenService.rotate(refreshToken);
            response.addHeader(HttpHeaders.SET_COOKIE,
                    RefreshCookie.of(rotated.rawToken(), props.refreshToken().ttl()).toString());
            return ResponseEntity.ok(new TokenResponse(jwtService.issueAccessToken(rotated.memberId())));
        } catch (InvalidRefreshTokenException e) {
            return unauthorized(response);
        }
    }

    /** 토스 미니앱 로그인. 쿠키를 쓰지 않는다. iOS WebView가 서드파티 쿠키를 막는다 (add-apps-in-toss D4). */
    @PostMapping("/toss")
    public TokenResponse tossLogin(@Valid @RequestBody TossLoginRequest request) {
        return new TokenResponse(tossAuthService.login(request.code()));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @CookieValue(name = RefreshCookie.NAME, required = false) String refreshToken,
            HttpServletResponse response) {
        if (refreshToken != null) {
            refreshTokenService.deleteByRawToken(refreshToken);
        }
        response.addHeader(HttpHeaders.SET_COOKIE, RefreshCookie.expired().toString());
        return ResponseEntity.noContent().build();
    }

    private ResponseEntity<TokenResponse> unauthorized(HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, RefreshCookie.expired().toString());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }
}
