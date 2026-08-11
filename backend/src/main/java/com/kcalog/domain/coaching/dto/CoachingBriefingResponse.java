package com.kcalog.domain.coaching.dto;

import java.util.List;

/**
 * 오늘의 브리핑 응답 — 헤드라인·본문·오늘의 추천 + 요약 지표(감량·달성률·연속).
 * hasData=false면 데이터 부족 안내(headline/message에 안내 문구, recommendations 비움).
 * source=LLM(생성) | FALLBACK(규칙 폴백) | NONE(데이터 부족).
 */
public record CoachingBriefingResponse(
        boolean hasData,
        String headline,
        String message,
        List<Recommendation> recommendations,
        Stats stats,
        String source
) {
    /** 3스탯 — 감량 변화(kg)·목표 달성률(%)·연속일. 산출 불가 시 각 null */
    public record Stats(Double lossKg, Integer adherencePct, Integer streakDays) {
    }

    /** 오늘의 추천 한 장 — category(meal/activity/hydration/habit)로 프론트가 아이콘 매핑 */
    public record Recommendation(String category, String title, String detail) {
    }

    /** 데이터 부족 안내 */
    public static CoachingBriefingResponse insufficient(Stats stats) {
        return new CoachingBriefingResponse(false,
                "기록이 더 쌓이면 코칭을 시작해요",
                "식사와 체중을 며칠 기록하면, 데이터에 맞는 오늘의 코칭을 만들어 드릴게요.",
                List.of(), stats, "NONE");
    }
}
