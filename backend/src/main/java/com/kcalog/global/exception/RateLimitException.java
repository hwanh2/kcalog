package com.kcalog.global.exception;

/**
 * 회원이 정해진 구간의 호출 상한을 넘김 — 429로 매핑된다.
 *
 * <p>상한 정책이 하나 늘 때마다 예외 클래스와 **똑같은 핸들러**가 짝지어 늘고 있었다
 * (분석·코치 채팅·의견). 공통 상위를 두어 핸들러는 하나로 끝낸다(PR #45 리뷰).
 * 하위 클래스는 어느 상한인지를 이름으로 말하는 역할만 한다.
 */
public abstract class RateLimitException extends RuntimeException {

    protected RateLimitException(String message) {
        super(message);
    }
}
