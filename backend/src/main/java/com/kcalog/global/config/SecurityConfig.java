package com.kcalog.global.config;

import com.kcalog.domain.auth.service.CustomOAuth2UserService;
import com.kcalog.domain.auth.service.OAuth2SuccessHandler;
import com.kcalog.global.common.AppProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.oauth2.server.resource.web.BearerTokenAuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Slf4j
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http,
                                    CustomOAuth2UserService oAuth2UserService,
                                    OAuth2SuccessHandler successHandler,
                                    AppProperties props) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                // 프론트가 다른 출처(kcalog.site)에서 서비스되므로 허용 목록 기반 CORS가 필요하다
                .cors(Customizer.withDefaults())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/**").permitAll()
                        // actuator 전체를 연다. 배포 파이프라인이 인증 없이 기동을 판정해야 하고,
                        // Prometheus도 인증 없이 지표를 긁어가야 하기 때문이다.
                        //
                        // 안전한 이유는 경로가 아니라 **포트**다. actuator는 관리 포트(8081)에만
                        // 매핑되고, Traefik은 그중 health만 공개 라우팅한다. 나머지는 보안 그룹으로
                        // 감시 서버만 닿는다. 이 필터 체인은 관리 포트에도 적용되므로(실측 확인),
                        // 여기서 인증을 요구하면 지표 수집이 통째로 401이 된다.
                        //
                        // 🔴 포트 분리가 전제다. management.server.port를 지우면 이 규칙이 그대로
                        // 지표를 인터넷에 공개하므로, ConfigurationSanityCheck가 기동을 막는다.
                        .requestMatchers("/actuator/**").permitAll()
                        .anyRequest().authenticated())
                .oauth2Login(oauth -> oauth
                        .userInfoEndpoint(userInfo -> userInfo.userService(oAuth2UserService))
                        .successHandler(successHandler)
                        .failureHandler((request, response, exception) -> {
                            log.warn("OAuth 로그인 실패: {}", exception.getMessage());
                            response.sendRedirect(props.frontendBaseUrl() + "/login?error=oauth");
                        }))
                // access 토큰(Bearer) 검증 — JwtConfig의 디코더 사용
                .oauth2ResourceServer(rs -> rs.jwt(Customizer.withDefaults()))
                // API 요청은 미인증 시 로그인 리다이렉트가 아니라 401을 받아야 한다
                .exceptionHandling(handling -> handling.defaultAuthenticationEntryPointFor(
                        new BearerTokenAuthenticationEntryPoint(),
                        PathPatternRequestMatcher.withDefaults().matcher("/api/**")));
        return http.build();
    }

    /**
     * 허용 목록에 있는 출처만 통과시킨다. 목록이 비면(로컬 — Vite 프록시로 동일 출처) CORS 헤더를 내리지 않는다.
     * refresh 쿠키를 쓰는 재발급·로그아웃 때문에 allowCredentials가 필요하고, 그래서 출처는 와일드카드일 수 없다.
     */
    @Bean
    CorsConfigurationSource corsConfigurationSource(AppProperties props) {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(props.cors().allowedOrigins());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "Accept"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
