package com.kcalog.global.exception;

import com.kcalog.domain.coaching.exception.DailyCoachChatLimitException;
import com.kcalog.domain.feedback.exception.FeedbackRateLimitException;
import com.kcalog.domain.meal.exception.DailyAnalysisLimitException;
import com.kcalog.domain.meal.exception.MealAnalysisException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.NoSuchElementException;

/** API 오류를 ProblemDetail(RFC 9457)로 통일한다 */
@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    /** @Valid 검증 실패 → 400 + 항목별 오류 메시지 */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidation(MethodArgumentNotValidException e) {
        Map<String, String> errors = new LinkedHashMap<>();
        for (FieldError fieldError : e.getBindingResult().getFieldErrors()) {
            errors.putIfAbsent(fieldError.getField(), fieldError.getDefaultMessage());
        }
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "입력값이 올바르지 않습니다");
        problem.setProperty("errors", errors);
        return problem;
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ProblemDetail handleIllegalArgument(IllegalArgumentException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, e.getMessage());
    }

    @ExceptionHandler(NoSuchElementException.class)
    public ProblemDetail handleNotFound(NoSuchElementException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, e.getMessage());
    }

    @ExceptionHandler(DailyAnalysisLimitException.class)
    public ProblemDetail handleAnalysisLimit(DailyAnalysisLimitException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.TOO_MANY_REQUESTS, e.getMessage());
    }

    @ExceptionHandler(DailyCoachChatLimitException.class)
    public ProblemDetail handleCoachChatLimit(DailyCoachChatLimitException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.TOO_MANY_REQUESTS, e.getMessage());
    }

    @ExceptionHandler(FeedbackRateLimitException.class)
    public ProblemDetail handleFeedbackRateLimit(FeedbackRateLimitException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.TOO_MANY_REQUESTS, e.getMessage());
    }

    @ExceptionHandler(MealAnalysisException.class)
    public ProblemDetail handleAnalysisFailure(MealAnalysisException e) {
        log.warn("식사 분석 실패: {}", e.getMessage());
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_GATEWAY, "사진 분석에 실패했어요. 잠시 후 다시 시도하거나 직접 입력해주세요.");
    }
}
