package com.kcalog.domain.auth;

import com.kcalog.domain.auth.entity.RefreshToken;
import com.kcalog.domain.auth.repository.RefreshTokenRepository;
import com.kcalog.domain.auth.service.JwtService;
import com.kcalog.domain.auth.service.RefreshCookie;
import com.kcalog.domain.auth.service.RefreshTokenService;
import com.kcalog.domain.member.entity.Member;
import com.kcalog.domain.member.entity.Provider;
import com.kcalog.domain.member.repository.MemberRepository;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AuthIntegrationTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    MemberRepository members;

    @Autowired
    RefreshTokenRepository refreshTokens;

    @Autowired
    RefreshTokenService refreshTokenService;

    @Autowired
    JwtService jwtService;

    Member member;

    @BeforeEach
    void setUp() {
        member = members.save(Member.signUp(Provider.KAKAO, "kakao-12345", null, "테스터"));
    }

    private Cookie refreshCookie(String raw) {
        return new Cookie(RefreshCookie.NAME, raw);
    }

    @Test
    @DisplayName("refresh 쿠키 없이 갱신 요청 → 401")
    void refreshWithoutCookie() throws Exception {
        mockMvc.perform(post("/api/auth/refresh"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("유효한 refresh → 200 + access 토큰 + 회전된 새 쿠키")
    void refreshRotates() throws Exception {
        String raw = refreshTokenService.issue(member.getId()).rawToken();

        mockMvc.perform(post("/api/auth/refresh").cookie(refreshCookie(raw)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(header().exists("Set-Cookie"))
                .andExpect(cookie().httpOnly(RefreshCookie.NAME, true));

        // 회전 후: 기존(revoked) + 신규 = 2행 보존
        assertThat(refreshTokens.countByMemberId(member.getId())).isEqualTo(2);
    }

    @Test
    @DisplayName("회전된 토큰 재사용 → 401 + 해당 회원 전체 토큰 무효화")
    void reuseDetection() throws Exception {
        String raw = refreshTokenService.issue(member.getId()).rawToken();
        refreshTokenService.rotate(raw); // 정상 회전 → raw는 revoked

        mockMvc.perform(post("/api/auth/refresh").cookie(refreshCookie(raw)))
                .andExpect(status().isUnauthorized())
                .andExpect(cookie().maxAge(RefreshCookie.NAME, 0));

        assertThat(refreshTokens.countByMemberId(member.getId())).isZero();
    }

    @Test
    @DisplayName("만료된 refresh → 401 + 토큰 삭제")
    void expiredToken() throws Exception {
        String raw = "expired-raw-token";
        refreshTokens.save(new RefreshToken(
                member.getId(), RefreshTokenService.hash(raw), Instant.now().minusSeconds(60)));

        mockMvc.perform(post("/api/auth/refresh").cookie(refreshCookie(raw)))
                .andExpect(status().isUnauthorized());

        assertThat(refreshTokens.countByMemberId(member.getId())).isZero();
    }

    @Test
    @DisplayName("로그아웃 → 204 + 이후 같은 토큰으로 갱신 불가")
    void logout() throws Exception {
        String raw = refreshTokenService.issue(member.getId()).rawToken();

        mockMvc.perform(post("/api/auth/logout").cookie(refreshCookie(raw)))
                .andExpect(status().isNoContent())
                .andExpect(cookie().maxAge(RefreshCookie.NAME, 0));

        mockMvc.perform(post("/api/auth/refresh").cookie(refreshCookie(raw)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("보호된 API — 토큰 없으면 401 (리다이렉트 아님)")
    void protectedApiWithoutToken() throws Exception {
        mockMvc.perform(get("/api/members/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("보호된 API — 유효한 access 토큰이면 인증 통과 (핸들러가 없어 404, 3번 그룹에서 200 검증)")
    void protectedApiWithToken() throws Exception {
        String access = jwtService.issueAccessToken(member.getId());

        mockMvc.perform(get("/api/members/me").header("Authorization", "Bearer " + access))
                .andExpect(status().isNotFound());
    }
}
