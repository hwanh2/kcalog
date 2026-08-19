package com.kcalog.global.config;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;

import java.util.Map;
import java.util.concurrent.atomic.AtomicReference;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 요청 식별자의 비동기 전파.
 * <p>
 * 사진 분석은 {@code analysisExecutor}의 다른 스레드에서 돈다. MDC는 스레드에 매인 값이라
 * 그냥 두면 <b>정작 오래 걸리고 실패가 잦은 분석 로그</b>만 어느 요청의 것인지 알 수 없게 된다.
 * <p>
 * 스레드 풀은 스레드를 재사용하므로 실행이 끝나면 원래대로 되돌려야 한다.
 * 되돌리지 않으면 다음 작업의 로그에 이전 요청의 식별자가 붙는다.
 */
class AsyncMdcPropagationTest {

    @AfterEach
    void clearMdc() {
        MDC.clear();
    }

    /** 다른 스레드에서 실행해 MDC가 실제로 건너가는지 본다. 같은 스레드면 전파 없이도 통과한다 */
    private Map<String, String> runOnOtherThread(Runnable task) throws InterruptedException {
        AtomicReference<Map<String, String>> seen = new AtomicReference<>();
        Thread worker = new Thread(() -> {
            task.run();
            seen.set(MDC.getCopyOfContextMap());
        });
        worker.start();
        worker.join();
        return seen.get();
    }

    @Test
    @DisplayName("제출한 요청의 식별자가 분석 스레드로 건너간다")
    void 식별자가_분석_스레드로_전파() throws InterruptedException {
        MDC.put("requestId", "a1b2c3d4e5f6");
        AtomicReference<String> seenInsideTask = new AtomicReference<>();

        Runnable decorated = AsyncConfig.withCallerMdc(() -> seenInsideTask.set(MDC.get("requestId")));
        runOnOtherThread(decorated);

        assertThat(seenInsideTask.get()).isEqualTo("a1b2c3d4e5f6");
    }

    @Test
    @DisplayName("실행이 끝나면 그 스레드의 MDC를 되돌린다 (풀이 스레드를 재사용한다)")
    void 실행_후_스레드_MDC_복원() throws InterruptedException {
        MDC.put("requestId", "a1b2c3d4e5f6");
        Runnable decorated = AsyncConfig.withCallerMdc(() -> {
        });

        Map<String, String> afterRun = runOnOtherThread(decorated);

        assertThat(afterRun).isNullOrEmpty();
    }

    @Test
    @DisplayName("호출 스레드에서 그대로 실행돼도(CallerRunsPolicy) 호출자의 MDC를 망가뜨리지 않는다")
    void 호출_스레드에서_실행돼도_원래_MDC_유지() {
        MDC.put("requestId", "호출자");
        // 큐 포화 시 제출한 스레드가 직접 실행한다. 그때 남의 MDC로 덮어쓰면 안 된다
        Runnable decorated = AsyncConfig.withCallerMdc(() -> MDC.put("requestId", "작업중"));

        decorated.run();

        assertThat(MDC.get("requestId")).isEqualTo("호출자");
    }
}
