package com.kcalog.global.common;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * JWT 서명 키 검증 — {@code SecretKeySpec}이 길이를 검사하지 않아서, 이 검증이 없으면
 * JWT_SECRET을 빠뜨린 채 배포해도 앱이 기동하고 헬스체크까지 통과한다(위조 가능한 토큰).
 */
class AppPropertiesValidationTest {

    private static final String VALID_SECRET = "kcalog-local-dev-only-secret-key-32bytes!";

    private final Validator validator;

    AppPropertiesValidationTest() {
        try (ValidatorFactory factory = Validation.buildDefaultValidatorFactory()) {
            this.validator = factory.getValidator();
        }
    }

    private AppProperties withSecret(String secret) {
        return new AppProperties("https://kcalog.site",
                new AppProperties.Jwt(secret, Duration.ofMinutes(30)),
                null, null, null, null, null, null);
    }

    @Test
    @DisplayName("서명 키가 비어 있으면 검증에 걸린다")
    void rejectsBlankSecret() {
        assertThat(validator.validate(withSecret(""))).isNotEmpty();
    }

    @Test
    @DisplayName("서명 키가 32바이트 미만이면 검증에 걸린다")
    void rejectsShortSecret() {
        // 환경변수 미주입 시 플레이스홀더가 그대로 남는 경우도 이 길이에 걸린다
        assertThat(validator.validate(withSecret("${JWT_SECRET}"))).isNotEmpty();
    }

    @Test
    @DisplayName("32바이트 이상이면 통과한다")
    void acceptsLongEnoughSecret() {
        assertThat(validator.validate(withSecret(VALID_SECRET))).isEmpty();
    }
}
