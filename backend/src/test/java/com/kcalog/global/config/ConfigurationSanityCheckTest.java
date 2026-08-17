package com.kcalog.global.config;

import com.kcalog.global.common.AppProperties;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 설정 누락 감지.
 * <p>
 * 이 검사가 막으려는 건 "앱은 뜨고 헬스체크도 UP인데 사용자 요청은 전부 실패하는" 배포다.
 * 특히 <b>빈 문자열</b> 경로가 중요하다 — 배포 워크플로우가 시크릿을 무조건 .env에 쓰기 때문에,
 * 등록하지 않은 GitHub Secret은 '없음'이 아니라 '빈 값'으로 도착한다.
 */
class ConfigurationSanityCheckTest {

    private static final String FRONT = "https://kcalog.site";

    private AppProperties props(String openAiKey, String storageSecret, List<String> origins) {
        return new AppProperties(FRONT,
                new AppProperties.Jwt("kcalog-local-dev-only-secret-key-32bytes!", Duration.ofMinutes(30)),
                new AppProperties.RefreshToken(Duration.ofDays(14)),
                new AppProperties.Openai(openAiKey, "https://api.openai.com/v1", "gpt-5.4-mini",
                        Duration.ofSeconds(20), 20, 30),
                new AppProperties.Storage("kcalog-photos", "https://r2.example.com", "auto",
                        "access", storageSecret, true, 24),
                new AppProperties.Analysis(50),
                new AppProperties.Cors(origins),
                new AppProperties.Feedback(null, null));
    }

    private AppProperties healthy() {
        return props("sk-real-key", "real-secret", List.of(FRONT));
    }

    private List<String> prod(AppProperties p) {
        return ConfigurationSanityCheck.problems(p, "kakao-id", "kakao-secret", true);
    }

    @Test
    @DisplayName("운영에서 시크릿이 빈 문자열이면 잡아낸다 — 배포가 실제로 실패하는 방식")
    void rejectsEmptySecretsInProd() {
        List<String> problems = prod(props("", "", List.of(FRONT)));

        assertThat(problems).contains("app.openai.api-key", "app.storage.secret-key");
    }

    @Test
    @DisplayName("운영에서 허용 출처 목록이 비면 잡아낸다 — 프론트의 모든 API 호출이 403이 된다")
    void rejectsEmptyCorsListInProd() {
        assertThat(prod(props("sk-real-key", "real-secret", List.of())))
                .contains("app.cors.allowed-origins");
    }

    @Test
    @DisplayName("운영에서 카카오 자격증명이 비면 잡아낸다 — 유일한 로그인 수단이다")
    void rejectsBlankKakaoInProd() {
        List<String> problems = ConfigurationSanityCheck.problems(healthy(), "", "  ", true);

        assertThat(problems).contains(
                "spring.security.oauth2.client.registration.kakao.client-id",
                "spring.security.oauth2.client.registration.kakao.client-secret");
    }

    @Test
    @DisplayName("카카오 값을 아예 읽지 못해도(미해석 플레이스홀더) 운영에서는 잡아낸다")
    void rejectsMissingKakaoInProd() {
        assertThat(ConfigurationSanityCheck.problems(healthy(), null, null, true))
                .contains("spring.security.oauth2.client.registration.kakao.client-id");
    }

    @Test
    @DisplayName("미해석 플레이스홀더는 운영이 아니어도 잡아낸다")
    void rejectsUnresolvedPlaceholderAnywhere() {
        AppProperties p = props("${OPENAI_API_KEY}", "real-secret", List.of(FRONT));

        assertThat(ConfigurationSanityCheck.problems(p, "id", "secret", false))
                .containsExactly("app.openai.api-key");
    }

    @Test
    @DisplayName("로컬은 허용 출처가 비어 있어도 정상 — Vite 프록시로 동일 출처라 필요 없다")
    void allowsEmptyCorsLocally() {
        AppProperties p = props("openai-key-placeholder", "minioadmin", List.of());

        assertThat(ConfigurationSanityCheck.problems(p, null, null, false)).isEmpty();
    }

    @Test
    @DisplayName("모든 값이 채워져 있으면 통과한다")
    void passesWhenFullyConfigured() {
        assertThat(prod(healthy())).isEmpty();
    }
}
