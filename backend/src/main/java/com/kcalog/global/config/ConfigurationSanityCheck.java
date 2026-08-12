package com.kcalog.global.config;

import com.kcalog.global.common.AppProperties;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/**
 * 환경변수 미주입을 기동 시점에 잡는다.
 * <p>
 * {@code application-prod.yml}은 시크릿을 {@code ${VAR}}로만 받지만, {@code @ConfigurationProperties}
 * 바인딩은 해석되지 않은 플레이스홀더를 <b>오류로 보지 않고 문자열 그대로</b> 넣는다. 그래서 변수를
 * 빠뜨린 채 배포해도 앱이 뜨고 헬스체크까지 통과하며, 사용자가 사진을 올리거나 로그인할 때에야
 * 실패가 드러난다. 배포 파이프라인은 이미 "성공"으로 끝난 뒤다.
 * <p>
 * 웹 서버가 요청을 받기 전에 터뜨려서, 잘못된 구성이 운영에 노출되지 않게 한다.
 */
@Configuration
@RequiredArgsConstructor
public class ConfigurationSanityCheck {

    private static final Pattern UNRESOLVED = Pattern.compile("\\$\\{[^}]+}");

    private final AppProperties props;

    @PostConstruct
    void verifyResolved() {
        List<String> unresolved = new ArrayList<>();

        check("app.frontend-base-url", props.frontendBaseUrl(), unresolved);
        check("app.openai.api-key", props.openai().apiKey(), unresolved);
        check("app.openai.base-url", props.openai().baseUrl(), unresolved);
        check("app.storage.bucket", props.storage().bucket(), unresolved);
        check("app.storage.endpoint", props.storage().endpoint(), unresolved);
        check("app.storage.region", props.storage().region(), unresolved);
        check("app.storage.access-key", props.storage().accessKey(), unresolved);
        check("app.storage.secret-key", props.storage().secretKey(), unresolved);
        props.cors().allowedOrigins()
                .forEach(origin -> check("app.cors.allowed-origins", origin, unresolved));

        if (!unresolved.isEmpty()) {
            throw new IllegalStateException(
                    "환경변수가 주입되지 않았다: " + String.join(", ", unresolved)
                            + " — 운영 배포라면 GitHub Secrets 등록과 .env 생성 단계를 확인할 것");
        }
    }

    private void check(String name, String value, List<String> unresolved) {
        if (value != null && UNRESOLVED.matcher(value).find()) {
            unresolved.add(name);
        }
    }
}
