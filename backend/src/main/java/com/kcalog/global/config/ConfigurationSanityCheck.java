package com.kcalog.global.config;

import com.kcalog.global.common.AppProperties;
import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/**
 * 설정 누락을 기동 시점에 잡는다. 웹 서버가 요청을 받기 전에 터뜨려 잘못된 구성이 운영에 노출되지 않게 한다.
 * <p>
 * 누락은 두 가지 모습으로 나타나고, 둘 다 조용히 통과한다는 게 문제였다.
 * <ul>
 *   <li><b>미해석 플레이스홀더</b> — {@code @ConfigurationProperties} 바인딩은 해석되지 않은 {@code ${VAR}}를
 *       오류로 보지 않고 문자열 그대로 넣는다. 로컬에서 변수를 빼고 실행할 때의 모습이다.</li>
 *   <li><b>빈 문자열</b> — 배포 워크플로우는 시크릿을 무조건 {@code KEY=값} 형태로 {@code .env}에 쓰므로,
 *       등록하지 않은 GitHub Secret은 '정의 안 됨'이 아니라 <b>빈 값</b>이 된다. 이게 실제 배포의 실패 모드다.
 *       빈 값이면 앱이 정상 기동하고 헬스체크도 UP이라 배포가 성공으로 끝난 뒤, 사용자 요청에서야 실패한다
 *       (예: CORS 허용 출처가 비면 프론트의 모든 API 호출이 403).</li>
 * </ul>
 * 빈 값 거부는 <b>운영 프로파일에서만</b> 적용한다 — 로컬은 Vite 프록시로 동일 출처라
 * {@code app.cors.allowed-origins}가 의도적으로 비어 있다.
 */
@Configuration
public class ConfigurationSanityCheck {

    private static final Pattern UNRESOLVED = Pattern.compile("\\$\\{[^}]+}");

    /** 카카오는 앱의 유일한 인증 수단이라 누락되면 로그인이 통째로 깨진다. app.* 밖이라 따로 읽는다. */
    private static final String KAKAO_CLIENT_ID = "spring.security.oauth2.client.registration.kakao.client-id";
    private static final String KAKAO_CLIENT_SECRET = "spring.security.oauth2.client.registration.kakao.client-secret";

    private final AppProperties props;
    private final Environment environment;

    ConfigurationSanityCheck(AppProperties props, Environment environment) {
        this.props = props;
        this.environment = environment;
    }

    @PostConstruct
    void verify() {
        boolean requireValues = environment.matchesProfiles("prod");
        List<String> problems = problems(props, resolve(KAKAO_CLIENT_ID), resolve(KAKAO_CLIENT_SECRET), requireValues);

        if (!problems.isEmpty()) {
            throw new IllegalStateException(
                    "설정이 비어 있거나 주입되지 않았다: " + String.join(", ", problems)
                            + " — 운영 배포라면 GitHub Secrets 등록과 .env 생성 단계를 확인할 것");
        }
    }

    /** 해석되지 않는 플레이스홀더는 예외를 던진다 — 여기서는 '없음'으로 넘겨 아래 검사에서 함께 보고한다. */
    private String resolve(String key) {
        try {
            return environment.getProperty(key);
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    /**
     * @param requireValues true면 빈 값도 문제로 본다(운영). false면 미해석 플레이스홀더만 본다(로컬·테스트).
     */
    static List<String> problems(AppProperties props, String kakaoClientId, String kakaoClientSecret,
                                 boolean requireValues) {
        List<String> problems = new ArrayList<>();

        check("app.frontend-base-url", props.frontendBaseUrl(), requireValues, problems);
        check("app.openai.api-key", props.openai().apiKey(), requireValues, problems);
        check("app.openai.base-url", props.openai().baseUrl(), requireValues, problems);
        check("app.storage.bucket", props.storage().bucket(), requireValues, problems);
        // R2를 쓰는 한 endpoint는 필수다. AWS S3(엔드포인트 생략)로 옮기면 이 항목을 예외 처리할 것.
        check("app.storage.endpoint", props.storage().endpoint(), requireValues, problems);
        check("app.storage.region", props.storage().region(), requireValues, problems);
        check("app.storage.access-key", props.storage().accessKey(), requireValues, problems);
        check("app.storage.secret-key", props.storage().secretKey(), requireValues, problems);
        props.cors().allowedOrigins()
                .forEach(origin -> check("app.cors.allowed-origins", origin, requireValues, problems));

        if (requireValues) {
            // 목록이 통째로 비면 위 forEach가 한 번도 돌지 않아 그냥 넘어간다 — 별도로 본다
            if (props.cors().allowedOrigins().isEmpty()) {
                problems.add("app.cors.allowed-origins");
            }
            check(KAKAO_CLIENT_ID, kakaoClientId, true, problems);
            check(KAKAO_CLIENT_SECRET, kakaoClientSecret, true, problems);
        }
        return problems;
    }

    private static void check(String name, String value, boolean requireValue, List<String> problems) {
        if (value != null && UNRESOLVED.matcher(value).find()) {
            problems.add(name);
            return;
        }
        if (requireValue && (value == null || value.isBlank())) {
            problems.add(name);
        }
    }
}
