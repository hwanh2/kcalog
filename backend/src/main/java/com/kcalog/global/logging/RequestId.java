package com.kcalog.global.logging;

import java.util.concurrent.ThreadLocalRandom;

/** 요청 식별자의 이름과 생성 규칙을 한곳에 둔다. 필터와 비동기 전파가 같은 값을 써야 한다 */
public final class RequestId {

    /** 응답 헤더 이름. 사용자가 문의할 때 이 값을 알려주면 곧장 그 요청의 로그를 찾는다 */
    public static final String HEADER = "X-Request-Id";

    /** MDC 키. 구조화 로그에서 이 이름의 필드로 나간다 */
    public static final String MDC_KEY = "requestId";

    private RequestId() {
    }

    /**
     * 12자리 16진수. 보안 토큰이 아니라 로그를 묶는 표식이라 예측 불가능성이 필요 없고,
     * 사람이 눈으로 읽어 전달할 수 있을 만큼 짧아야 한다(UUID는 길어서 불러주기 어렵다).
     */
    static String generate() {
        long value = ThreadLocalRandom.current().nextLong() & 0xFFFF_FFFF_FFFFL;
        return String.format("%012x", value);
    }
}
