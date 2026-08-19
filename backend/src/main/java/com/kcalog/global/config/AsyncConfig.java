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

    /**
     * 의견 알림 메일 전용 풀.
     *
     * <p>이름 없는 {@code @Async}는 {@code TaskExecutor} 빈이 둘 이상이면 유일 매칭에 실패해
     * 기본 {@code SimpleAsyncTaskExecutor}(작업마다 새 스레드)로 떨어진다. 지금은 그게 우연히
     * 무해하지만, 누군가 {@code taskExecutor}라는 이름의 빈을 추가하면 **메일 발송이 조용히 그
     * 풀로 옮겨간다.** 어디서 도는지는 우연이 아니라 적혀 있어야 한다(PR #45 리뷰).
     *
     * <p>작게 잡는다 — 의견은 하루 몇 건이고, 분석 풀과 섞이면 SMTP 지연이 사진 분석을 밀어낸다.
     */
    @Bean("mailExecutor")
    public Executor mailExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(1);
        executor.setMaxPoolSize(2);
        executor.setQueueCapacity(50);
        executor.setThreadNamePrefix("mail-");
        // 큐가 차면 버린다 — 알림은 있으면 좋은 것이고, 여기서 요청 스레드를 붙잡으면
        // 저장과 알림을 떼어놓은 의미가 없어진다(analysisExecutor와 정책이 다른 이유)
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.DiscardPolicy());
        // 발송이 실패했을 때 어느 의견 때문이었는지 이어보려면 요청 식별자가 따라와야 한다
        executor.setTaskDecorator(AsyncConfig::withCallerMdc);
        executor.initialize();
        return executor;
    }

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
