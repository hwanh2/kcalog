package com.kcalog.domain.analysis;

import com.kcalog.IntegrationTest;
import com.kcalog.domain.analysis.entity.AnalysisJob;
import com.kcalog.domain.analysis.entity.AnalysisStatus;
import com.kcalog.domain.analysis.repository.AnalysisJobRepository;
import com.kcalog.domain.analysis.service.AnalysisCleanup;
import com.kcalog.domain.analysis.service.AnalysisStartupRecovery;
import com.kcalog.domain.member.entity.Member;
import com.kcalog.domain.member.entity.Provider;
import com.kcalog.domain.member.repository.MemberRepository;
import com.kcalog.global.storage.StorageService;
import com.kcalog.support.InMemoryStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.annotation.Transactional;

import javax.sql.DataSource;

import static org.assertj.core.api.Assertions.assertThat;

/** 기동 복구·미확인 작업 정리 — 스케줄러/러너 로직을 직접 호출해 검증 (동일 스레드, @Transactional) */
@IntegrationTest
@Transactional
class AnalysisMaintenanceTest {

    @Autowired
    AnalysisStartupRecovery recovery;
    @Autowired
    AnalysisCleanup cleanup;
    @Autowired
    AnalysisJobRepository jobRepository;
    @Autowired
    MemberRepository memberRepository;
    @Autowired
    StorageService storageService;
    @Autowired
    DataSource dataSource;

    Member member;

    @BeforeEach
    void setUp() {
        member = memberRepository.save(Member.signUp(Provider.KAKAO, "kakao-maint", "m@kakao.com", "정리"));
    }

    @Test
    @DisplayName("기동 복구 — ANALYZING 고아 작업을 FAILED(INTERRUPTED)로 정리")
    void startupRecovery() {
        AnalysisJob job = jobRepository.save(AnalysisJob.analyzing(member.getId(), member.getId() + "/orphan"));

        recovery.run(null);

        AnalysisJob recovered = jobRepository.findById(job.getId()).orElseThrow();
        assertThat(recovered.getStatus()).isEqualTo(AnalysisStatus.FAILED);
        assertThat(recovered.getErrorCode()).isEqualTo("INTERRUPTED");
    }

    @Test
    @DisplayName("미확인 작업 정리 — 보존 기간 지난 작업과 사진 삭제")
    void cleanupExpired() {
        String key = storageService.put(member.getId(), "bytes".getBytes(), "image/jpeg");
        AnalysisJob job = jobRepository.save(AnalysisJob.analyzing(member.getId(), key));
        // created_at을 보존 기간보다 훨씬 이전으로 백데이트 (감사값을 우회)
        JdbcClient.create(dataSource)
                .sql("UPDATE analysis_job SET created_at = TIMESTAMP '2000-01-01 00:00:00+00' WHERE id = :id")
                .param("id", job.getId()).update();

        cleanup.cleanupExpired();

        assertThat(jobRepository.findById(job.getId())).isEmpty();
        assertThat(((InMemoryStorageService) storageService).has(key)).isFalse();
    }

    @Test
    @DisplayName("최근 작업은 정리에서 제외")
    void keepsRecent() {
        String key = storageService.put(member.getId(), "bytes".getBytes(), "image/jpeg");
        AnalysisJob job = jobRepository.save(AnalysisJob.analyzing(member.getId(), key));

        cleanup.cleanupExpired();

        assertThat(jobRepository.findById(job.getId())).isPresent();
    }
}
