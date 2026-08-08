package com.kcalog.domain.meal.dto;

import java.math.BigDecimal;
import java.util.List;

/** 사진 분석 결과 (미저장) — 프론트가 확인·수정 후 SaveMealRequest로 저장한다.
 *  음식별 항목 배열 + 전체 신뢰도. box는 오버레이 렌더링 전용(정규화 0~1)이며 저장하지 않는다.
 *  foodFound=false면 items 빈 배열(수동 입력 유도), notes는 사용자 안내 문구 */
public record MealAnalysisResponse(
        boolean foodFound,
        List<AnalyzedItem> items,
        BigDecimal overallConfidence,
        String notes
) {
    public static MealAnalysisResponse notFound(String notes) {
        return new MealAnalysisResponse(false, List.of(), BigDecimal.ZERO, notes);
    }

    /** 음식 한 항목 — 이름·영양값 + 사진 위 위치 박스(오버레이용, 미저장) */
    public record AnalyzedItem(
            String name,
            int kcal,
            BigDecimal carbG,
            BigDecimal proteinG,
            BigDecimal fatG,
            Box box
    ) {
    }

    /** 이미지 정규화 좌표(0~1) — 좌상단 x,y와 폭·높이. 오버레이 전용, 부정확 시 프론트가 목록형으로 폴백 */
    public record Box(double x, double y, double w, double h) {
    }
}
