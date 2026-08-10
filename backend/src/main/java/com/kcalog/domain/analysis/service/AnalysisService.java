package com.kcalog.domain.analysis.service;

import com.kcalog.domain.analysis.entity.AnalysisJob;
import com.kcalog.domain.analysis.repository.AnalysisJobRepository;
import com.kcalog.domain.meal.service.MealAnalysisService;
import com.kcalog.global.storage.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.NoSuchElementException;

/**
 * 비동기 분석 오케스트레이션 — 일일 제한 판정 → 사진 저장 → 작업 생성(ANALYZING).
 * 실제 분석은 커밋 후 워커가 수행하므로, 컨트롤러가 createJob 반환 뒤 워커를 트리거한다.
 */
@Service
@RequiredArgsConstructor
public class AnalysisService {

    private final AnalysisJobRepository jobRepository;
    private final StorageService storageService;
    private final MealAnalysisService mealAnalysisService;

    /** 일일 제한 판정(초과 시 429) → 사진 저장 → ANALYZING 작업 생성. jobId 반환(커밋 후 워커 트리거) */
    @Transactional
    public Long createJob(Long memberId, byte[] image, String contentType) {
        mealAnalysisService.enforceDailyLimit(memberId);
        String imageKey = storageService.put(memberId, image, contentType);
        AnalysisJob job = jobRepository.save(AnalysisJob.analyzing(memberId, imageKey));
        return job.getId();
    }

    /** 소유권 검증 조회 — 타인/미존재는 404 */
    @Transactional(readOnly = true)
    public AnalysisJob get(Long memberId, Long jobId) {
        return owned(memberId, jobId);
    }

    /**
     * 확인 저장 시 작업의 사진을 넘겨받는다 — imageKey를 반환하고 작업 행은 삭제한다(사진은 삭제하지 않음).
     * 이후 사진은 meal이 소유하며, 남는 미확인 작업만 정리 대상이 된다.
     */
    @Transactional
    public String consumeJobImage(Long memberId, Long jobId) {
        AnalysisJob job = owned(memberId, jobId);
        String imageKey = job.getImageKey();
        jobRepository.delete(job);
        return imageKey;
    }

    private AnalysisJob owned(Long memberId, Long jobId) {
        AnalysisJob job = jobRepository.findById(jobId)
                .orElseThrow(() -> new NoSuchElementException("분석 작업을 찾을 수 없습니다"));
        if (!job.isOwnedBy(memberId)) {
            throw new NoSuchElementException("분석 작업을 찾을 수 없습니다");
        }
        return job;
    }
}
