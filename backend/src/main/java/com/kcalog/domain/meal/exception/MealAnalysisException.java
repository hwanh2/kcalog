package com.kcalog.domain.meal.exception;

/** OpenAI 호출·파싱 실패 (재시도 후에도) — 502로 매핑, 프론트는 수동 입력으로 폴백 */
public class MealAnalysisException extends RuntimeException {

    public MealAnalysisException(String message, Throwable cause) {
        super(message, cause);
    }
}
