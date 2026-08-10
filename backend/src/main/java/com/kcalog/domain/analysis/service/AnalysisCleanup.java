package com.kcalog.domain.analysis.service;

import com.kcalog.domain.analysis.entity.AnalysisJob;
import com.kcalog.domain.analysis.repository.AnalysisJobRepository;
import com.kcalog.global.common.AppProperties;
import com.kcalog.global.storage.StorageService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * 미확인 작업 정리 (design D6) — 보존 기간 지난 분석 작업과 그 사진을 삭제한다.
 * 확인 저장된 작업은 저장 시 삭제되므로, 남은 오래된 작업은 모두 미확인분이다.
 * 확정 meal의 사진은 별도 key 소유(작업 삭제 시 사진은 meal이 계속 참조)라 여기서 지워지지 않는다.
 */
@Slf4j
@Component
public class AnalysisCleanup {

    private final AnalysisJobRepository jobRepository;
    private final StorageService storageService;
    private final Clock clock;
    private final int retentionHours;

    public AnalysisCleanup(AnalysisJobRepository jobRepository, StorageService storageService,
                           Clock clock, AppProperties props) {
        this.jobRepository = jobRepository;
        this.storageService = storageService;
        this.clock = clock;
        this.retentionHours = props.storage().retentionHours();
    }

    @Scheduled(fixedDelayString = "${app.storage.cleanup-interval-ms:3600000}")
    @Transactional
    public void cleanupExpired() {
        Instant cutoff = Instant.now(clock).minus(retentionHours, ChronoUnit.HOURS);
        List<AnalysisJob> expired = jobRepository.findByCreatedAtBefore(cutoff);
        if (expired.isEmpty()) return;
        expired.forEach(job -> storageService.delete(job.getImageKey()));
        jobRepository.deleteAll(expired);
        log.info("미확인 분석 작업 {}건과 사진 정리", expired.size());
    }
}
