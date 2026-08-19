package com.kcalog.global.config;

import com.kcalog.global.common.AppProperties;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.cors.CorsConfiguration;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * CORS 허용 정책 — 프론트(kcalog.site)와 API(api.kcalog.site)가 다른 출처라서 필요해진 설정.
 * Spring 컨텍스트를 띄우지 않고 빈 생성 결과만 확인한다(허용 출처를 바꾸려면 컨텍스트를 갈라야 하는데,
 * 그러면 Testcontainers 컨테이너가 하나 더 뜬다).
 */
class SecurityConfigCorsTest {

    private static final String FRONT = "https://kcalog.site";

    private CorsConfiguration configFor(List<String> allowedOrigins) {
        AppProperties props = new AppProperties(FRONT, null, null, null, null, null,
                new AppProperties.Cors(allowedOrigins), null);
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/members/me");
        return new SecurityConfig().corsConfigurationSource(props).getCorsConfiguration(request);
    }

    @Test
    @DisplayName("허용 목록의 출처만 통과시키고 자격증명 포함 요청을 허용한다")
    void allowsListedOriginWithCredentials() {
        CorsConfiguration config = configFor(List.of(FRONT));

        assertThat(config.checkOrigin(FRONT)).isEqualTo(FRONT);
        assertThat(config.getAllowCredentials()).isTrue();
        assertThat(config.getAllowedHeaders()).contains("Authorization");
    }

    @Test
    @DisplayName("허용 목록에 없는 출처는 통과시키지 않는다")
    void rejectsUnlistedOrigin() {
        CorsConfiguration config = configFor(List.of(FRONT));

        assertThat(config.checkOrigin("https://evil.example")).isNull();
    }

    @Test
    @DisplayName("허용 출처에 와일드카드를 두지 않는다")
    void neverAllowsWildcard() {
        CorsConfiguration config = configFor(List.of(FRONT));

        assertThat(config.getAllowedOrigins()).doesNotContain("*");
        assertThat(config.getAllowedOriginPatterns()).isNull();
    }

    @Test
    @DisplayName("허용 출처가 비어 있으면(로컬) 어떤 출처도 통과하지 않는다")
    void emptyListAllowsNothing() {
        CorsConfiguration config = configFor(List.of());

        assertThat(config.checkOrigin(FRONT)).isNull();
    }
}
