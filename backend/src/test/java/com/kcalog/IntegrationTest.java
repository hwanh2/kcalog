package com.kcalog;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 통합 테스트 공통 구성. 반드시 이 어노테이션을 사용할 것 —
 * 구성이 동일해야 Spring 컨텍스트 캐시가 공유되어 Testcontainers Postgres가 1개만 뜬다.
 *
 * <p><b>관리 포트를 되돌리는 이유.</b> 운영은 actuator를 8081로 분리하지만(지표를 공개 도메인에서
 * 감추기 위해), 그러면 actuator가 별도 컨텍스트로 가서 {@code MockMvc}가 닿지 못한다. 테스트에서만
 * 애플리케이션 컨텍스트로 되돌려 헬스체크 동작(미인증 접근, 상세 비노출)을 검증한다.
 *
 * <p>여기서 검증하지 못하는 <b>포트 분리 자체</b>는 두 곳이 대신 지킨다.
 * {@code ConfigurationSanityCheckTest}가 규칙을 단위로 검증하고, 운영 프로파일 기동 시
 * {@code ConfigurationSanityCheck}가 분리되지 않았으면 기동을 막는다.
 */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@SpringBootTest(properties = "management.server.port=")
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
public @interface IntegrationTest {
}
