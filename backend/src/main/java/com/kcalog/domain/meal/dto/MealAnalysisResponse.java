package com.kcalog.domain.meal.dto;

import java.math.BigDecimal;
import java.util.List;

/** 분석 결과 (미저장) — 프론트가 확인·수정 후 SaveMealRequest로 저장한다.
 *  음식별 항목 배열 + 전체 신뢰도. box는 오버레이 렌더링 전용(정규화 0~1)이며 저장하지 않는다.
 *  사진 없는 분석(설명만)은 box가 null이다.
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

    /** 음식 한 항목 — 이름·섭취량·영양값 + 사진 위 위치 박스(오버레이용, 미저장).
     *  amount·unit은 AI가 추정한 섭취량("180", "g")으로 <b>수정 가능한 추정치</b>다 — 사용자가 수량을 고치면
     *  프론트가 영양값을 비례 재계산한다. corrected는 개인 보정치로 값이 대체됐는지(AI 스키마 밖 후처리 플래그). */
    public record AnalyzedItem(
            String name,
            int kcal,
            BigDecimal carbG,
            BigDecimal proteinG,
            BigDecimal fatG,
            BigDecimal amount,
            String unit,
            BoundingBox box,
            boolean corrected
    ) {
        /** 개인 보정값으로 대체한 새 항목 — 이름·섭취량·위치는 유지, 영양값만 교체하고 corrected 표시 */
        public AnalyzedItem overriddenWith(int kcal, BigDecimal carbG, BigDecimal proteinG, BigDecimal fatG) {
            return new AnalyzedItem(name, kcal, carbG, proteinG, fatG, amount, unit, box, true);
        }
    }

    /** 이미지 정규화 좌표(0~1) — 좌상단 x,y와 폭·높이. 오버레이 전용, 부정확 시 프론트가 목록형으로 폴백 */
    public record BoundingBox(double x, double y, double w, double h) {
    }
}
