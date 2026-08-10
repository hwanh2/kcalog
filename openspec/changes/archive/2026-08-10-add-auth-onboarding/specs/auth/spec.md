# auth

## ADDED Requirements

### Requirement: 소셜 로그인
시스템은 카카오 OAuth2를 통한 로그인을 지원해야 한다(SHALL). 회원 식별은 provider 확장(구글 등)을 전제로 `provider + provider_id` 조합을 유지해야 한다(MUST). 로그인 성공 시 `provider + provider_id`로 회원을 조회하고, 없으면 신규 회원을 생성해야 한다(SHALL). 이메일은 제공되지 않을 수 있으므로 필수로 요구하지 않아야 한다(MUST NOT).

#### Scenario: 신규 회원 첫 로그인
- **WHEN** 카카오 인증을 처음 완료한 사용자가 콜백에 도달하면
- **THEN** 시스템은 provider 프로필(provider_id, 이메일·닉네임이 있으면 함께)로 member 레코드를 생성하고, refresh 토큰을 HttpOnly 쿠키로 설정한 뒤 프론트엔드 `/auth/callback`으로 리다이렉트한다

#### Scenario: 기존 회원 재로그인
- **WHEN** 이미 가입된 `provider + provider_id`의 사용자가 로그인을 완료하면
- **THEN** 새 member를 만들지 않고 기존 회원으로 refresh 토큰을 발급한다

#### Scenario: OAuth 인증 실패
- **WHEN** 사용자가 provider 동의 화면에서 거부하거나 인증이 실패하면
- **THEN** 시스템은 프론트엔드 로그인 화면으로 오류 표시와 함께 리다이렉트하고 회원·토큰을 생성하지 않는다

### Requirement: Access 토큰 발급과 갱신
시스템은 유효한 refresh 쿠키를 가진 요청에 대해 `POST /api/auth/refresh`로 새 JWT access 토큰(만료 30분)을 발급해야 한다(SHALL). refresh 토큰은 사용할 때마다 회전(기존 무효화 + 신규 발급)되어야 한다(MUST).

#### Scenario: 정상 갱신
- **WHEN** 유효한 refresh 쿠키로 `POST /api/auth/refresh`를 호출하면
- **THEN** 응답 본문에 access 토큰을 반환하고, 새 refresh 토큰을 쿠키로 재설정하며, 이전 refresh 토큰은 즉시 무효화된다

#### Scenario: 만료·무효 refresh 토큰
- **WHEN** 만료되었거나 DB에 없는 refresh 토큰으로 갱신을 요청하면
- **THEN** 401을 반환하고 쿠키를 만료시킨다

#### Scenario: 회전된 토큰 재사용 감지
- **WHEN** 이미 회전되어 무효화된 refresh 토큰이 다시 사용되면
- **THEN** 해당 회원의 모든 refresh 토큰을 무효화하고 401을 반환한다

### Requirement: 로그아웃
시스템은 `POST /api/auth/logout` 호출 시 해당 refresh 토큰을 서버에서 삭제하고 쿠키를 만료시켜야 한다(SHALL).

#### Scenario: 로그아웃
- **WHEN** 로그인된 사용자가 로그아웃을 요청하면
- **THEN** refresh_token 레코드가 삭제되고 쿠키가 만료되며, 이후 해당 refresh 토큰으로는 갱신할 수 없다

### Requirement: API 접근 제어
`/api/auth/**`와 OAuth 엔드포인트를 제외한 모든 API는 유효한 access 토큰(Bearer)을 요구해야 한다(MUST).

#### Scenario: 토큰 없이 보호된 API 호출
- **WHEN** Authorization 헤더 없이 `GET /api/members/me`를 호출하면
- **THEN** 401을 반환한다

#### Scenario: 유효한 토큰으로 호출
- **WHEN** 유효한 access 토큰과 함께 보호된 API를 호출하면
- **THEN** 토큰의 회원 컨텍스트로 요청이 처리된다

#### Scenario: 만료된 access 토큰 자동 복구 (프론트)
- **WHEN** 프론트엔드 API 호출이 401을 받으면
- **THEN** 프론트엔드는 refresh를 1회 시도한 뒤 원 요청을 재시도하고, refresh도 실패하면 로그인 화면으로 이동시킨다
