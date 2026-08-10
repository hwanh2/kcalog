package com.kcalog.domain.analysis.repository;

import com.kcalog.domain.analysis.entity.AnalysisJob;
import com.kcalog.domain.analysis.entity.AnalysisStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;

public interface AnalysisJobRepository extends JpaRepository<AnalysisJob, Long> {

    /** 기동 복구 — ANALYZING로 남은 고아 작업 */
    List<AnalysisJob> findByStatus(AnalysisStatus status);

    /** 미확인 작업 정리 — 생성 시각이 기준 이전인 작업 */
    List<AnalysisJob> findByCreatedAtBefore(Instant cutoff);
}
