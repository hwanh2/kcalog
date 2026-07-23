package com.kcalog.domain.auth.service;

import com.kcalog.global.common.AppProperties;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

/** OAuth 성공 → refresh 쿠키 설정 → 프론트 /auth/callback으로 리다이렉트 (access는 프론트가 refresh 호출로 획득) */
@Component
@RequiredArgsConstructor
public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final RefreshTokenService refreshTokenService;
    private final AppProperties props;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        OAuth2User principal = (OAuth2User) authentication.getPrincipal();
        Long memberId = principal.getAttribute(CustomOAuth2UserService.MEMBER_ID_ATTRIBUTE);

        RefreshTokenService.IssuedToken issued = refreshTokenService.issue(memberId);
        response.addHeader(HttpHeaders.SET_COOKIE,
                RefreshCookie.of(issued.rawToken(), props.refreshToken().ttl()).toString());

        clearAuthenticationAttributes(request);
        getRedirectStrategy().sendRedirect(request, response, props.frontendBaseUrl() + "/auth/callback");
    }
}
