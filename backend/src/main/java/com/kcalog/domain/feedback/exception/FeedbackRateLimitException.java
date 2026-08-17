package com.kcalog.domain.feedback.exception;

import com.kcalog.global.exception.RateLimitException;

/** 한 회원이 짧은 시간에 너무 많이 보냄 — 429로 매핑된다 */
public class FeedbackRateLimitException extends RateLimitException {

    public FeedbackRateLimitException(String message) {
        super(message);
    }
}
