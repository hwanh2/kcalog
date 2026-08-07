package com.kcalog.domain.meal.exception;

/** 회원의 당일 분석 호출이 상한을 초과 — 429로 매핑된다 */
public class DailyAnalysisLimitException extends RuntimeException {

    public DailyAnalysisLimitException(String message) {
        super(message);
    }
}
