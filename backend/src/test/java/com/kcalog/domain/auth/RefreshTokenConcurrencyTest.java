package com.kcalog.domain.auth;

import com.kcalog.TestcontainersConfiguration;
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
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 스레드별 독립 트랜잭션이 필요해 @Transactional 없이 실제 커밋으로 검증한다.
 * @AutoConfigureMockMvc는 다른 통합 테스트와 컨텍스트 캐시(컨테이너 1개)를 공유하기 위함.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
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
    @DisplayName("같은 refresh 토큰 동시 회전 — 어떤 인터리빙에서도 유효 토큰 체인이 2개로 분기하지 않는다")
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

        // 인터리빙에 따라 정상 결말이 두 가지다:
        //  - 진짜 겹침: 조건부 UPDATE가 한쪽만 통과 → 성공 1·거절 1, 토큰 2행(revoked 원본+신규)
        //  - 직렬화: 늦은 쪽이 revoked 토큰을 제시한 셈 → 재사용 감지 → 전체 무효화 → 0행
        //    (직렬 재사용 경로는 AuthIntegrationTest.reuseDetection이 결정적으로 검증)
        // 여기서는 어느 쪽이든 성립해야 하는 보안 불변식만 단정한다.
        assertThat(success.get()).as("회전 성공이 2회면 유효 체인 분기 = 취약점").isLessThanOrEqualTo(1);
        assertThat(success.get() + rejected.get()).as("예상 밖 예외 없음").isEqualTo(2);
        assertThat(refreshTokens.countByMemberId(member.getId()))
                .as("토큰 3행이면 레이스가 뚫린 것").isLessThanOrEqualTo(2);
    }
}
