package com.kcalog.domain.feedback.exception;

/** 한 회원이 짧은 시간에 너무 많이 보냄 — 429로 매핑된다 */
public class FeedbackRateLimitException extends RuntimeException {

    public FeedbackRateLimitException(String message) {
        super(message);
    }
}
