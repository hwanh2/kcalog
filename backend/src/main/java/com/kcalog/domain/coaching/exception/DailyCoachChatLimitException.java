package com.kcalog.domain.coaching.exception;

/** 회원의 당일 코치 채팅 호출이 상한을 초과 — 429로 매핑된다 */
public class DailyCoachChatLimitException extends RuntimeException {

    public DailyCoachChatLimitException(String message) {
        super(message);
    }
}
