package com.kcalog.domain.analysis.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kcalog.domain.analysis.entity.AnalysisJob;
import com.kcalog.domain.analysis.entity.AnalysisStatus;
import com.kcalog.domain.analysis.repository.AnalysisJobRepository;
import com.kcalog.domain.correction.dto.PersonalCorrection;
import com.kcalog.domain.correction.service.FoodCorrectionService;
import com.kcalog.domain.meal.dto.MealAnalysisResponse;
import com.kcalog.domain.meal.exception.MealAnalysisException;
import com.kcalog.domain.meal.service.MealAnalysisService;
import com.kcalog.global.storage.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * 비동기 분석 워커 — 저장된 사진을 읽어 OpenAI 분석 후 작업 상태를 전이한다 (design D8: MealAnalysisService 재사용).
 * 별도 스레드·트랜잭션에서 실행되므로 호출 전에 작업이 커밋돼 있어야 한다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AnalysisWorker {

    private final AnalysisJobRepository jobRepository;
    private final StorageService storageService;
    private final MealAnalysisService mealAnalysisService;
    private final FoodCorrectionService foodCorrectionService;
    // 프레임워크 ObjectMapper 빈에 의존하지 않는다(프로젝트 관례)
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Async("analysisExecutor")
    @Transactional
    public void process(Long jobId) {
        AnalysisJob job = jobRepository.findById(jobId).orElse(null);
        if (job == null || job.getStatus() != AnalysisStatus.ANALYZING) {
            return; // 이미 처리됐거나 정리됨
        }
        try {
            StorageService.StoredImage image = storageService.get(job.getImageKey());
            // 개인 보정: 이력을 프롬프트에 주입(B)해 분석하고, 정규화 이름 일치 항목은 저장값으로 덮어쓰기(A)
            List<PersonalCorrection> corrections = foodCorrectionService.recentFor(job.getMemberId());
            MealAnalysisResponse result = mealAnalysisService.analyzeImage(
                    image.bytes(), image.contentType(), corrections);
            result = foodCorrectionService.applyOverride(result, corrections);
            String json = objectMapper.writeValueAsString(result);
            if (result.foodFound()) {
                job.complete(json);
            } else {
                job.noFood(json);
            }
        } catch (MealAnalysisException e) {
            log.warn("분석 작업 {} 실패: {}", jobId, e.getMessage());
            job.fail("ANALYSIS_ERROR");
        } catch (Exception e) {
            log.warn("분석 작업 {} 처리 오류: {}", jobId, e.getMessage());
            job.fail("ANALYSIS_ERROR");
        }
    }
}
