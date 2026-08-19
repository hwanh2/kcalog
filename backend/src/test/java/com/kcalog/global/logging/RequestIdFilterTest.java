package com.kcalog.global.logging;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 요청 식별자 부여.
 * <p>
 * 이 필터가 막으려는 건 "장애가 났는데 어느 로그가 그 요청의 것인지 모르는" 상황이다.
 * 동시 요청이 있으면 시간대로는 구분되지 않고, 사진 분석처럼 오래 걸리는 요청은 특히 그렇다.
 * <p>
 * Spring 컨텍스트를 띄우지 않는다. 필터 하나의 동작이라 목 객체로 충분하다.
 */
class RequestIdFilterTest {

    private final RequestIdFilter filter = new RequestIdFilter();

    @AfterEach
    void clearMdc() {
        MDC.clear();
    }

    private MockHttpServletResponse callThrough(MockHttpServletRequest request) throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, new MockFilterChain());
        return response;
    }

    @Test
    @DisplayName("응답 헤더로 요청 식별자를 내보낸다 (사용자가 문의할 때 이 값을 전달한다)")
    void 응답_헤더에_식별자() throws Exception {
        MockHttpServletResponse response = callThrough(new MockHttpServletRequest("GET", "/api/members/me"));

        assertThat(response.getHeader(RequestId.HEADER)).isNotBlank();
    }

    @Test
    @DisplayName("요청마다 다른 식별자를 준다")
    void 요청마다_다른_식별자() throws Exception {
        List<String> ids = new ArrayList<>();
        for (int i = 0; i < 50; i++) {
            ids.add(callThrough(new MockHttpServletRequest("GET", "/api/members/me")).getHeader(RequestId.HEADER));
        }

        assertThat(ids).doesNotHaveDuplicates();
    }

    @Test
    @DisplayName("처리 중에는 MDC에 식별자가 있고, 응답 헤더의 값과 같다")
    void 처리_중_MDC에_존재() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/members/me");
        MockHttpServletResponse response = new MockHttpServletResponse();
        List<String> seenInsideChain = new ArrayList<>();

        filter.doFilter(request, response, (req, res) -> seenInsideChain.add(MDC.get(RequestId.MDC_KEY)));

        assertThat(seenInsideChain).containsExactly(response.getHeader(RequestId.HEADER));
    }

    @Test
    @DisplayName("처리가 끝나면 MDC를 비운다 (스레드가 재사용되므로 남기면 다음 요청에 남의 식별자가 붙는다)")
    void 처리_후_MDC_정리() throws Exception {
        callThrough(new MockHttpServletRequest("GET", "/api/members/me"));

        assertThat(MDC.get(RequestId.MDC_KEY)).isNull();
    }

    @Test
    @DisplayName("체인에서 예외가 나도 MDC를 비운다")
    void 예외에도_MDC_정리() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/members/me");

        try {
            filter.doFilter(request, new MockHttpServletResponse(), (req, res) -> {
                throw new IllegalStateException("분석 실패");
            });
        } catch (Exception expected) {
            // 예외 자체는 상위에서 처리한다. 여기서 볼 것은 MDC가 남지 않는다는 사실뿐이다
        }

        assertThat(MDC.get(RequestId.MDC_KEY)).isNull();
    }

    @Test
    @DisplayName("클라이언트가 보낸 식별자는 쓰지 않는다 (로그를 읽는 쪽을 속이는 값이 심길 수 있다)")
    void 클라이언트가_보낸_값_무시() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/members/me");
        request.addHeader(RequestId.HEADER, "관리자-요청-인-것처럼");

        MockHttpServletResponse response = callThrough(request);

        assertThat(response.getHeader(RequestId.HEADER)).isNotEqualTo("관리자-요청-인-것처럼");
    }
}
