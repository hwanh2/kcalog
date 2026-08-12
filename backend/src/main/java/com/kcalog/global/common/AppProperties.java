package com.kcalog.global.common;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.time.Duration;
import java.util.List;

@Validated
@ConfigurationProperties(prefix = "app")
public record AppProperties(String frontendBaseUrl, @Valid Jwt jwt, RefreshToken refreshToken, Openai openai,
                            Storage storage, Analysis analysis, Cors cors) {

    /** 교차 출처 허용 설정 — 운영은 프론트 도메인 하나. 로컬은 Vite 프록시로 동일 출처라 비어 있어도 된다.
     *  와일드카드는 쓰지 않는다(자격증명 포함 요청과 함께 쓸 수 없고, 공개 서비스에서 쿠키를 아무 출처에나 열게 된다). */
    public record Cors(List<String> allowedOrigins) {

        public Cors {
            allowedOrigins = allowedOrigins == null ? List.of() : List.copyOf(allowedOrigins);
        }
    }

    /** 분석 개인화 설정 — correctionInjectLimit: 프롬프트에 주입할 최근 보정치 상한(토큰·지연 방어). */
    public record Analysis(int correctionInjectLimit) {
    }

    /**
     * HS256 서명 키. 길이를 여기서 강제한다 — {@code SecretKeySpec}은 어떤 길이든 받아주기 때문에,
     * 검증이 없으면 JWT_SECRET을 빠뜨린 채 배포해도 앱이 "정상" 기동하고 헬스체크까지 통과한다.
     * 그 상태의 토큰은 사실상 누구나 위조할 수 있다. 기동을 실패시키는 편이 낫다.
     */
    public record Jwt(
            @NotBlank(message = "app.jwt.secret(JWT_SECRET)이 비어 있다")
            @Size(min = 32, message = "app.jwt.secret(JWT_SECRET)은 HS256용으로 32바이트 이상이어야 한다")
            String secret,
            Duration accessTokenTtl) {
    }

    public record RefreshToken(Duration ttl) {
    }

    /** OpenAI 설정. apiKey는 환경변수 주입 필수(로컬 기본값은 placeholder).
     *  dailyCoachChatLimit: 회원당 하루 코치 채팅 호출 상한(LLM 비용 가드레일). */
    public record Openai(String apiKey, String baseUrl, String model, Duration timeout,
                         int dailyAnalysisLimit, int dailyCoachChatLimit) {
    }

    /** 사진 Object Storage 설정 — S3 호환(로컬 MinIO / 운영 S3·R2). endpoint 비우면 AWS 기본.
     *  pathStyle은 MinIO·R2에 true, AWS S3에 false. retentionHours 지난 미확인 분석 사진을 정리한다. */
    public record Storage(String bucket, String endpoint, String region,
                          String accessKey, String secretKey, boolean pathStyle, int retentionHours) {
    }
}
