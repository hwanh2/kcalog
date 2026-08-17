package com.kcalog.global.exception;

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

    /**
     * 모든 호출 상한 초과 — 분석·코치 채팅·의견이 같은 상위를 쓴다.
     * 상한 정책이 늘 때마다 똑같은 핸들러가 함께 늘던 것을 여기서 끊는다(PR #45 리뷰).
     * 무엇이 걸렸는지는 각 예외가 담은 문구가 말한다.
     */
    @ExceptionHandler(RateLimitException.class)
    public ProblemDetail handleRateLimit(RateLimitException e) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.TOO_MANY_REQUESTS, e.getMessage());
    }

    @ExceptionHandler(MealAnalysisException.class)
    public ProblemDetail handleAnalysisFailure(MealAnalysisException e) {
        log.warn("식사 분석 실패: {}", e.getMessage());
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_GATEWAY, "사진 분석에 실패했어요. 잠시 후 다시 시도하거나 직접 입력해주세요.");
    }
}
