package com.kcalog.domain.auth.exception;

/**
 * 앱인토스 API를 쓸 수 없음(인증서 미설정, 네트워크 오류, 요청 한도 초과, 5xx). 503으로 매핑된다.
 * 사용자의 코드가 잘못된 경우와 나눠야 프론트가 "다시 시도"를 띄울지 판단할 수 있다.
 */
public class AppsInTossUnavailableException extends RuntimeException {

    public AppsInTossUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
