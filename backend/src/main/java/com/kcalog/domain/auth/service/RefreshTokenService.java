package com.kcalog.domain.auth.service;

import com.kcalog.domain.auth.entity.RefreshToken;
import com.kcalog.domain.auth.exception.InvalidRefreshTokenException;
import com.kcalog.domain.auth.repository.RefreshTokenRepository;
import com.kcalog.global.common.AppProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;

@Slf4j
@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final RefreshTokenRepository refreshTokens;
    private final AppProperties props;

    public record IssuedToken(Long memberId, String rawToken) {
    }

    @Transactional
    public IssuedToken issue(Long memberId) {
        byte[] bytes = new byte[48];
        RANDOM.nextBytes(bytes);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        Instant expiresAt = Instant.now().plus(props.refreshToken().ttl());
        refreshTokens.save(new RefreshToken(memberId, hash(raw), expiresAt));
        return new IssuedToken(memberId, raw);
    }

    /**
     * 회전: 기존 토큰을 revoked로 마킹하고 새 토큰을 발급한다.
     * revoked 토큰의 재사용은 탈취 의심으로 보고 해당 회원의 모든 토큰을 무효화한다.
     * noRollbackFor: 예외로 401을 반환하더라도 무효화(삭제/마킹)는 반드시 커밋되어야 한다.
     */
    @Transactional(noRollbackFor = InvalidRefreshTokenException.class)
    public IssuedToken rotate(String rawToken) {
        RefreshToken token = refreshTokens.findByTokenHash(hash(rawToken))
                .orElseThrow(() -> new InvalidRefreshTokenException("unknown refresh token"));

        if (token.isRevoked()) {
            // 탈취 의심 보안 이벤트 — 운영에서 이 로그의 빈도가 모니터링 대상 (토큰 값은 남기지 않는다)
            log.warn("refresh token reuse detected: memberId={}", token.getMemberId());
            refreshTokens.deleteAllByMemberId(token.getMemberId());
            throw new InvalidRefreshTokenException("refresh token reuse detected");
        }
        if (token.isExpired()) {
            refreshTokens.delete(token);
            throw new InvalidRefreshTokenException("refresh token expired");
        }

        // 조건부 UPDATE로 회전 경합을 원자적으로 판정한다. 영향 행 0 = 방금(ms 단위) 다른 요청이
        // 먼저 회전한 양성 레이스(멀티탭·재시도)로 보고, 전체 무효화 없이 401만 반환한다.
        // 시간이 지난 뒤 revoked 토큰이 조회되는 위의 경로만 탈취 의심(전체 무효화)으로 다룬다.
        if (refreshTokens.revokeIfActive(token.getId(), Instant.now()) == 0) {
            throw new InvalidRefreshTokenException("concurrent rotation");
        }
        return issue(token.getMemberId());
    }

    @Transactional
    public void deleteByRawToken(String rawToken) {
        refreshTokens.findByTokenHash(hash(rawToken)).ifPresent(refreshTokens::delete);
    }

    public static String hash(String raw) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(raw.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
