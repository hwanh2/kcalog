package com.kcalog.domain.coaching.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.task.SimpleAsyncTaskExecutor;
import org.springframework.core.task.TaskExecutor;

/**
 * 코칭 SSE 스트림 실행기 — 코칭 볼륨이 낮고 일일 상한이 있어 요청당 스레드로 충분.
 * 별도 빈으로 두어 테스트에서 동기 실행기로 대체(스트림 완료를 결정적으로 대기)할 수 있게 한다.
 */
@Configuration
public class CoachingStreamConfig {

    @Bean
    public TaskExecutor coachStreamExecutor() {
        return new SimpleAsyncTaskExecutor("coach-stream-");
    }
}
