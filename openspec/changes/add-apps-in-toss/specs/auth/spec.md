## ADDED Requirements

### Requirement: 앱인토스 익명 키 로그인
시스템은 `POST /api/auth/toss` 요청 본문의 1회용 인가 코드를 앱인토스 API에서 익명 키로 교환해 회원을 식별해야 한다(SHALL). 회원 식별은 기존 규칙대로 `provider + provider_id`이며, provider는 `TOSS`, provider_id는 익명 키다(MUST). 회원이 없으면 새로 만들어야 한다(SHALL). 성공하면 응답 본문에 access 토큰을 돌려주고, refresh 토큰과 쿠키는 발급하지 않아야 한다(MUST NOT). 앱인토스 API 호출은 mTLS로 해야 한다(MUST). 같은 사람이 카카오와 토스로 들어와도 두 회원을 합치지 않아야 한다(MUST NOT).

#### Scenario: 토스 신규 회원
- **WHEN** 처음 보는 익명 키로 교환되는 인가 코드로 `POST /api/auth/toss`를 호출하면
- **THEN** provider가 TOSS인 회원이 생성되고 응답 본문에 access 토큰이 오며, Set-Cookie 헤더는 없다

#### Scenario: 토스 기존 회원
- **WHEN** 이미 가입된 익명 키로 교환되는 인가 코드로 호출하면
- **THEN** 새 회원을 만들지 않고 기존 회원의 access 토큰을 돌려준다

#### Scenario: 무효한 인가 코드
- **WHEN** 만료되었거나 이미 쓴 인가 코드로 호출하면
- **THEN** 401을 반환하고 회원을 만들지 않는다

#### Scenario: 앱인토스 API 장애
- **WHEN** 앱인토스 API가 응답하지 않거나 실패 응답을 주면
- **THEN** 503을 반환하고 회원을 만들지 않는다

#### Scenario: 인가 코드 누락
- **WHEN** 본문에 인가 코드 없이 호출하면
- **THEN** 400을 반환한다

### Requirement: 토스 빌드의 access 토큰 갱신
토스 빌드의 프론트엔드는 refresh 쿠키를 쓰지 않아야 한다(MUST NOT). 앱 시작 시와 API 호출이 401을 받았을 때 새 인가 코드로 익명 키 로그인을 다시 해 access 토큰을 받아야 한다(SHALL). 재로그인 후 원 요청을 1회 재시도하고, 재로그인도 실패하면 다시 시도할 수 있는 오류 화면을 보여야 한다(SHALL). 동시에 여러 요청이 401을 받아도 재로그인은 한 번만 해야 한다(MUST).

#### Scenario: 토큰 만료 후 자동 복구
- **WHEN** 토스 빌드에서 access 토큰이 만료된 상태로 API를 호출해 401을 받으면
- **THEN** 프론트엔드는 익명 키 로그인을 다시 하고 원 요청을 재시도해 성공한다

#### Scenario: 동시 401
- **WHEN** 세 개의 요청이 동시에 401을 받으면
- **THEN** `POST /api/auth/toss`는 한 번만 호출되고 세 요청 모두 새 토큰으로 재시도된다

#### Scenario: 재로그인 실패
- **WHEN** 재로그인이 실패하면
- **THEN** 로그인 화면으로 이동하지 않고 다시 시도 버튼이 있는 오류 화면을 보여 준다
