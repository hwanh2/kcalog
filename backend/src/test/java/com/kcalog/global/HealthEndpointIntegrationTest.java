package com.kcalog.global;

import com.kcalog.IntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** 헬스체크 — 배포 파이프라인이 인증 없이 기동 성공을 판정할 수 있어야 한다 */
@IntegrationTest
class HealthEndpointIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    @DisplayName("인증 없이 헬스체크를 조회하면 서비스 상태를 응답한다")
    void healthIsPublic() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    @DisplayName("헬스체크는 내부 구성 상세를 노출하지 않는다")
    void healthHidesDetails() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.components").doesNotExist())
                .andExpect(jsonPath("$.details").doesNotExist());
    }

    @Test
    @DisplayName("health 외의 actuator 엔드포인트는 노출하지 않는다")
    void otherEndpointsAreNotExposed() throws Exception {
        // env가 열리면 JWT 시크릿·API 키가 그대로 새어나간다
        mockMvc.perform(get("/actuator/env"))
                .andExpect(status().is4xxClientError());
    }

    @Test
    @DisplayName("허용 목록에 없는 출처의 요청에는 교차 출처 허용 헤더를 내리지 않는다")
    void unlistedOriginGetsNoCorsHeader() throws Exception {
        // 테스트 구성은 허용 목록이 비어 있다(로컬과 동일) — 어떤 출처도 통과하면 안 된다
        mockMvc.perform(get("/api/members/me").header("Origin", "https://evil.example"))
                .andExpect(content().string(org.hamcrest.Matchers.not(org.hamcrest.Matchers.containsString("evil.example"))))
                .andExpect(result -> {
                    String allowed = result.getResponse().getHeader("Access-Control-Allow-Origin");
                    if (allowed != null) {
                        throw new AssertionError("허용되지 않은 출처에 CORS 허용 헤더가 내려갔다: " + allowed);
                    }
                });
    }
}
