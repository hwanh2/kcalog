package com.kcalog.global.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;

/** 비동기 분석 실행기 + 스케줄링 활성화 (design D4). 단일 인스턴스 MVP용 인프로세스 풀 */
@Configuration
@EnableAsync
@EnableScheduling
public class AsyncConfig {

    @Bean("analysisExecutor")
    public Executor analysisExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(50);
        executor.setThreadNamePrefix("analysis-");
        // 큐 포화 시 거부(TaskRejectedException) 대신 호출 스레드에서 실행 —
        // 작업이 ANALYZING로 stuck되거나 컨트롤러가 500을 던지는 것을 막는다(느려질 뿐 유실 없음)
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        executor.initialize();
        return executor;
    }
}
