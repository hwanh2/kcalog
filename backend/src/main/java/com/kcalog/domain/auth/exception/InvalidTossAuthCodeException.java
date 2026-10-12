package com.kcalog.domain.auth.exception;

/** 앱인토스가 인가 코드를 거절함(만료, 재사용). 401로 매핑되고, 프론트는 새 코드로 다시 시도한다. */
public class InvalidTossAuthCodeException extends RuntimeException {

    public InvalidTossAuthCodeException() {
        super("유효하지 않은 앱인토스 인가 코드");
    }
}
