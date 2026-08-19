package com.kcalog.global.config;

import org.slf4j.MDC;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.Map;
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
        // 요청 스레드의 MDC를 분석 스레드로 옮긴다. 없으면 요청 식별자가 여기서 끊겨,
        // 정작 오래 걸리고 실패가 잦은 분석 로그만 어느 요청의 것인지 알 수 없게 된다.
        executor.setTaskDecorator(AsyncConfig::withCallerMdc);
        executor.initialize();
        return executor;
    }

    /**
     * 제출 시점(요청 스레드)의 MDC를 실행 시점(분석 스레드)에 복원하고, 끝나면 되돌린다.
     *
     * <p>되돌리는 것이 중요하다. 풀의 스레드는 재사용되므로, 지우지 않으면 다음 작업의 로그에
     * 이전 요청의 식별자가 붙는다. 거부 정책이 CallerRunsPolicy라 <b>요청 스레드에서 그대로
     * 실행되는 경우</b>도 있어, 그때 남의 MDC로 덮어쓰지 않도록 원래 값을 복원한다.
     */
    static Runnable withCallerMdc(Runnable task) {
        Map<String, String> callerContext = MDC.getCopyOfContextMap();
        return () -> {
            Map<String, String> previous = MDC.getCopyOfContextMap();
            setContext(callerContext);
            try {
                task.run();
            } finally {
                setContext(previous);
            }
        };
    }

    private static void setContext(Map<String, String> context) {
        if (context == null) {
            MDC.clear();
        } else {
            MDC.setContextMap(context);
        }
    }
}
