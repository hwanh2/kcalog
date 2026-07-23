# Design: add-auth-onboarding

## Context

MVP 설계 문서(docs/2026-07-22-mvp-design.md)에서 기술 스택과 데이터 모델은 확정됨. 이 변경은 저장소의 첫 구현 변경으로, 빈 `backend/`·`frontend/` 디렉터리에 프로젝트를 scaffold하고 인증·온보딩을 구현한다. 이후 모든 기능 변경이 여기서 만든 회원·토큰 기반 위에 쌓이므로, 인증 구조 결정이 곧 프로젝트 전체의 기반 결정이다.

## Goals / Non-Goals

**Goals:**
- Spring Boot 4 + React SPA 프로젝트 골격 (로컬 개발 환경 포함)
- 카카오 OAuth2 로그인 → JWT access(메모리) + refresh(HttpOnly 쿠키) 체계
- 온보딩: 프로필·목표 입력 → 일일 칼로리 목표 자동 계산
- `member`, `refresh_token`, `weight_log` 테이블과 마이그레이션 체계

**Non-Goals:**
- 식사/운동/리포트 기능 (후속 변경)
- 배포 파이프라인 (로컬 실행까지만; 배포는 별도 변경)
- 회원 탈퇴·계정 연동 해제 (MVP 후순위)
- 푸시 알림, 이메일 인증
- 구글 로그인 (추후 별도 변경 — 다만 Provider enum·`provider + provider_id` 식별 구조는 다중 provider 전제를 유지)

## Decisions

### D1. OAuth 흐름: 서버사이드 Authorization Code (Spring OAuth2 Client)

프론트는 `GET {API}/oauth2/authorization/kakao`로 이동만 시킨다. 콜백 처리·토큰 교환은 전부 Spring이 담당하고, 성공 핸들러가 refresh 토큰을 HttpOnly 쿠키로 심은 뒤 프론트의 `/auth/callback`으로 리다이렉트한다. 프론트는 콜백 페이지에서 `POST /api/auth/refresh`를 호출해 access 토큰을 메모리에 받는다.

- 대안(프론트에서 SDK로 인가 코드 받아 백엔드에 전달)은 클라이언트 시크릿 관리와 provider별 분기가 늘어나 학습 목적(Spring Security/OAuth2)에도 맞지 않아 기각.
- access 토큰을 리다이렉트 URL 쿼리로 넘기지 않는다(브라우저 히스토리·로그 노출). refresh 쿠키 → refresh 호출 경로로 통일.

### D2. 토큰 정책

- **Access**: JWT(HS256, 시크릿 키), 만료 30분. 클레임은 `sub`(member id) 최소한만.
- **Refresh**: 불투명 랜덤 토큰(UUID 계열), 만료 14일, HttpOnly + Secure + SameSite=Lax 쿠키, `Path=/api/auth`. DB에는 SHA-256 해시만 저장.
- **회전(rotation)**: refresh 사용 시마다 기존 토큰을 revoked로 마킹(재사용 감지 위해 보존)하고 새 토큰 발급. revoked 토큰이 다시 사용되면 탈취 의심으로 해당 회원의 refresh 전부 무효화. 만료 토큰은 사용 시점에 삭제.
- 로그아웃: DB 행 삭제 + 쿠키 만료.

### D3. 일일 칼로리 목표 계산: Mifflin-St Jeor + 활동계수 + 목표 조정

- BMR: 남 `10w + 6.25h − 5a + 5`, 여 `10w + 6.25h − 5a − 161` (w=현재 체중 kg, h=키 cm, a=나이=현재연도−출생연도)
- TDEE = BMR × 활동계수 (LOW 1.2 / MID 1.5 / HIGH 1.75)
- 목표 조정: 목표체중 < 현재체중이면 −500, 목표체중 > 현재체중이면 +300, 같으면 0
- 하한선: 남 1500 / 여 1200 kcal 미만으로 내려가지 않게 클램프
- 결과는 10 단위 반올림. 온보딩 화면에서 제안값으로 보여주고 사용자가 수정한 값을 최종 저장.
- 계산 로직은 순수 함수형 서비스(`DailyKcalCalculator`)로 분리해 단위 테스트 대상으로 삼는다.

### D4. 온보딩 완료 판정: `daily_kcal_target IS NULL` 여부

member의 프로필 필드(gender, birth_year, height_cm, activity_level, target_weight_kg, daily_kcal_target)는 nullable로 두고, `daily_kcal_target`이 null이면 온보딩 미완료로 판정한다. `GET /api/members/me` 응답에 `onboardingCompleted` boolean을 포함하고, 프론트 라우터가 이 값으로 온보딩 화면 강제 이동을 처리한다. 별도 상태 컬럼(`onboarded_at`)은 YAGNI로 보류.

### D5. 현재 체중은 member가 아니라 weight_log가 소유

설계 문서대로 member에는 체중 컬럼을 두지 않는다. 온보딩에서 입력받은 현재 체중은 `weight_log`(오늘 날짜)로 저장하고, 칼로리 계산·프로필 표시는 최신 weight_log를 읽는다. 이 변경에서 weight_log는 테이블과 "최신 체중 조회"만 만들고, 체중 기록 화면·그래프는 후속 `weight` 변경에서 다룬다.

### D6. Scaffold 구성

- **백엔드**: Spring Boot 4.0.x, Java 21, Gradle(Kotlin DSL). (설계 문서는 Boot 3이었으나 2026-06 Boot 3.x OSS 지원 종료로 Initializr에서 제거되어 4.0.7로 결정 — 학습 범위에 영향 없음) 의존성: webmvc, security, oauth2-client, data-jpa, validation, postgresql, flyway. 패키지는 `domain/{도메인}/{controller,service,repository,entity,dto,exception}` + `global/{config,common}` 구조 (2026-07-23 리팩토링으로 확정, 컨벤션은 AGENTS.md). Lombok 사용. 스키마 관리는 **Flyway 마이그레이션**(V1__init.sql) — `ddl-auto=validate`.
- **프론트**: Vite + React + TypeScript, react-router, TanStack Query, vite-plugin-pwa. API 클라이언트는 fetch 래퍼(401 시 refresh 1회 재시도 인터셉터).
- **로컬 개발**: `docker-compose.yml`로 Postgres 16. OAuth 키·JWT 시크릿은 `.env`/환경변수, `.gitignore` 처리. Vite dev proxy로 `/api`·`/oauth2` → 8080 포워딩(쿠키 SameSite 문제 회피).

## Risks / Trade-offs

- [카카오 OAuth 앱 심사·설정 지연] → 로컬 리다이렉트 URI(`http://localhost:8080/...`)는 심사 없이 등록 가능. 개발용 앱을 먼저 만들고 운영 앱은 배포 변경에서.
- [refresh 쿠키 SameSite와 프론트/백엔드 도메인 분리] → 로컬은 Vite proxy로 동일 출처화. 운영 도메인 전략은 배포 변경에서 결정(동일 루트 도메인 서브도메인 권장).
- [Mifflin-St Jeor의 한국인 정확도 한계] → MVP에선 제안값일 뿐이고 사용자 수정 가능. 정확도 개선은 데이터 쌓인 뒤.
- [access 토큰 메모리 보관 → 새로고침 시 소실] → 앱 부트스트랩 때 refresh 호출로 복구. refresh마저 만료면 로그인 화면.
- [카카오는 이메일 제공이 선택 동의] → email nullable 허용, 식별은 `provider + provider_id` UNIQUE로만.

## Migration Plan

신규 프로젝트라 롤백 대상 없음. Flyway `V1__init.sql`에 member/refresh_token/weight_log 생성. 이후 변경은 V2+로 누적.

## Open Questions

- 서비스명 미정 → 패키지명은 임시로 `com.kcalog` 사용, 이름 확정 시 일괄 변경 (문서에 이미 예고됨).
- 운영 배포 도메인·쿠키 도메인 전략은 배포 변경에서 결정.
