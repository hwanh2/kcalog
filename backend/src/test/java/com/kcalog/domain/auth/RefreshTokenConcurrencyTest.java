package com.kcalog.domain.auth;

import com.kcalog.domain.auth.exception.InvalidRefreshTokenException;
import com.kcalog.domain.auth.repository.RefreshTokenRepository;
import com.kcalog.domain.auth.service.RefreshTokenService;
import com.kcalog.domain.member.entity.Member;
import com.kcalog.domain.member.entity.Provider;
import com.kcalog.domain.member.repository.MemberRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/** 스레드별 독립 트랜잭션이 필요해 @Transactional 없이 실제 커밋으로 검증한다 */
@SpringBootTest
class RefreshTokenConcurrencyTest {

    @Autowired
    RefreshTokenService refreshTokenService;

    @Autowired
    RefreshTokenRepository refreshTokens;

    @Autowired
    MemberRepository members;

    @AfterEach
    void cleanUp() {
        refreshTokens.deleteAll();
        members.deleteAll();
    }

    @Test
    @DisplayName("같은 refresh 토큰 동시 회전 — 정확히 1개만 성공하고, 양성 레이스는 전체 무효화를 트리거하지 않는다")
    void concurrentRotation() throws Exception {
        Member member = members.save(Member.signUp(Provider.KAKAO, "kakao-race", null, "동시성"));
        String raw = refreshTokenService.issue(member.getId()).rawToken();

        int threads = 2;
        CountDownLatch start = new CountDownLatch(1);
        AtomicInteger success = new AtomicInteger();
        AtomicInteger rejected = new AtomicInteger();

        ExecutorService pool = Executors.newFixedThreadPool(threads);
        for (int i = 0; i < threads; i++) {
            pool.submit(() -> {
                try {
                    start.await();
                    refreshTokenService.rotate(raw);
                    success.incrementAndGet();
                } catch (InvalidRefreshTokenException e) {
                    rejected.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            });
        }
        start.countDown();
        pool.shutdown();
        assertThat(pool.awaitTermination(10, TimeUnit.SECONDS)).isTrue();

        assertThat(success.get()).isEqualTo(1);
        assertThat(rejected.get()).isEqualTo(1);
        // 기존(revoked) 1 + 새 토큰 1 — 레이스가 뚫리면 3이 되고, 전체 무효화가 오발되면 0이 된다
        assertThat(refreshTokens.countByMemberId(member.getId())).isEqualTo(2);
    }
}
