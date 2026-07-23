package com.kcalog.global.config;

import com.kcalog.domain.auth.service.CustomOAuth2UserService;
import com.kcalog.domain.auth.service.OAuth2SuccessHandler;
import com.kcalog.global.common.AppProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.oauth2.server.resource.web.BearerTokenAuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;

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
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/**").permitAll()
                        .anyRequest().authenticated())
                .oauth2Login(oauth -> oauth
                        .userInfoEndpoint(userInfo -> userInfo.userService(oAuth2UserService))
                        .successHandler(successHandler)
                        .failureHandler((request, response, exception) ->
                                response.sendRedirect(props.frontendBaseUrl() + "/login?error=oauth")))
                // access 토큰(Bearer) 검증 — JwtConfig의 디코더 사용
                .oauth2ResourceServer(rs -> rs.jwt(Customizer.withDefaults()))
                // API 요청은 미인증 시 로그인 리다이렉트가 아니라 401을 받아야 한다
                .exceptionHandling(handling -> handling.defaultAuthenticationEntryPointFor(
                        new BearerTokenAuthenticationEntryPoint(),
                        PathPatternRequestMatcher.withDefaults().matcher("/api/**")));
        return http.build();
    }
}
