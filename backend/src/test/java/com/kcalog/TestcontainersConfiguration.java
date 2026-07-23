package com.kcalog;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.testcontainers.containers.PostgreSQLContainer;

/**
 * 통합 테스트용 Postgres — Testcontainers가 테스트마다 격리된 DB를 띄운다 (로컬 docker compose 불필요).
 * 같은 컨텍스트 구성을 쓰는 테스트끼리는 Spring 컨텍스트 캐시로 컨테이너를 공유한다.
 */
@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfiguration {

    @Bean
    @ServiceConnection
    PostgreSQLContainer<?> postgresContainer() {
        return new PostgreSQLContainer<>("postgres:16-alpine");
    }
}
