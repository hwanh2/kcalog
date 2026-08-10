package com.kcalog.domain.analysis.service;

import com.kcalog.domain.analysis.entity.AnalysisJob;
import com.kcalog.domain.analysis.entity.AnalysisStatus;
import com.kcalog.domain.analysis.repository.AnalysisJobRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 기동 복구 (design D4) — 재시작으로 ANALYZING에 멈춘 고아 작업을 FAILED(INTERRUPTED)로 정리.
 * 인프로세스 @Async라 재시작 시 진행 중 작업은 유실되므로, 무한 대기 대신 재요청을 유도한다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AnalysisStartupRecovery implements ApplicationRunner {

    private final AnalysisJobRepository jobRepository;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        List<AnalysisJob> stuck = jobRepository.findByStatus(AnalysisStatus.ANALYZING);
        if (stuck.isEmpty()) return;
        stuck.forEach(job -> job.fail("INTERRUPTED"));
        jobRepository.saveAll(stuck);
        log.info("기동 복구 — 중단된 분석 작업 {}건을 FAILED로 정리", stuck.size());
    }
}
