package com.kcalog.domain.meal.dto;

import java.math.BigDecimal;

/** 사진 분석 결과 (미저장) — 프론트가 확인·수정 후 SaveMealRequest로 저장한다.
 *  foodFound=false면 음식 미검출(수동 입력 유도), notes는 사용자 안내 문구 */
public record MealAnalysisResponse(
        boolean foodFound,
        int totalKcal,
        BigDecimal carbG,
        BigDecimal proteinG,
        BigDecimal fatG,
        BigDecimal confidence,
        String notes
) {
    public static MealAnalysisResponse notFound(String notes) {
        return new MealAnalysisResponse(false, 0, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, notes);
    }
}
