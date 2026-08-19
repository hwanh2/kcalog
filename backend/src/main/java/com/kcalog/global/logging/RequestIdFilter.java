package com.kcalog.global.logging;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * 요청마다 식별자를 만들어 MDC에 넣고 응답 헤더로도 내보낸다.
 *
 * <p>이게 없으면 장애를 볼 때 시간대로 짐작해 로그를 훑어야 하는데, 동시 요청이 있으면 섞여서
 * 쓸 수 없다. 특히 사진 분석처럼 오래 걸리는 요청은 그 사이 다른 요청의 로그가 잔뜩 낀다.
 *
 * <p>가장 앞에 둔다. 뒤쪽 필터(보안 등)에서 나는 로그에도 식별자가 붙어야 한다.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestIdFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        // 클라이언트가 보낸 값을 쓰지 않고 항상 새로 만든다. 받아 쓰면 임의의 문자열이
        // 로그 필드로 들어와, 로그를 읽는 쪽을 속이는 값을 심을 수 있다.
        String requestId = RequestId.generate();
        MDC.put(RequestId.MDC_KEY, requestId);
        response.setHeader(RequestId.HEADER, requestId);

        try {
            filterChain.doFilter(request, response);
        } finally {
            // 반드시 지운다. 스레드 풀이 스레드를 재사용하므로, 남겨두면 다음 요청의 로그에
            // 이전 요청의 식별자가 붙는다. 틀린 값이 붙는 편이 없는 것보다 나쁘다.
            MDC.remove(RequestId.MDC_KEY);
        }
    }
}
