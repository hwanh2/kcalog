package com.kcalog.domain.analysis.dto;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kcalog.domain.analysis.entity.AnalysisJob;
import com.kcalog.domain.analysis.entity.AnalysisStatus;
import com.kcalog.domain.meal.dto.MealAnalysisResponse;
import com.kcalog.global.storage.PhotoUrls;

/**
 * 분석 작업 응답 — 상태 + 사진 URL + (완료/미검출 시) 분석 결과 + (실패 시) 사유.
 * result는 COMPLETED/NO_FOOD일 때만 채워진다(FAILED/ANALYZING이면 null).
 */
public record AnalysisResponse(
        Long id,
        String status,
        String imageUrl,
        MealAnalysisResponse result,
        String errorCode
) {
    // 프레임워크 ObjectMapper 빈에 의존하지 않는다(프로젝트 관례 — 고정 스키마 파싱 전용)
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    public static AnalysisResponse from(AnalysisJob job) {
        MealAnalysisResponse result = null;
        if (job.getResultJson() != null
                && (job.getStatus() == AnalysisStatus.COMPLETED || job.getStatus() == AnalysisStatus.NO_FOOD)) {
            try {
                result = OBJECT_MAPPER.readValue(job.getResultJson(), MealAnalysisResponse.class);
            } catch (Exception e) {
                throw new IllegalStateException("분석 결과 역직렬화 실패", e);
            }
        }
        return new AnalysisResponse(
                job.getId(),
                job.getStatus().name(),
                PhotoUrls.of(job.getImageKey()),
                result,
                job.getErrorCode());
    }
}
