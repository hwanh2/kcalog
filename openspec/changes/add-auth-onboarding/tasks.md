# Tasks: add-auth-onboarding

## 1. 프로젝트 Scaffold

- [x] 1.1 backend: Spring Boot 4.0.7(Java 21, Gradle Kotlin DSL) 프로젝트 생성 — webmvc, security, oauth2-client, data-jpa, validation, postgresql, flyway 의존성
- [x] 1.2 docker-compose.yml로 로컬 Postgres 16 구성, application.yml 프로파일(local) 및 환경변수 골격(.env.example, .gitignore 갱신)
- [x] 1.3 Flyway `V1__init.sql` 작성 — member, refresh_token, weight_log 테이블 (설계 문서 §5 스키마, ddl-auto=validate)
- [x] 1.4 frontend: Vite + React + TypeScript 프로젝트 생성 — react-router, TanStack Query, vite-plugin-pwa 설정
- [x] 1.5 Vite dev proxy 설정 (`/api`, `/oauth2`, `/login/oauth2` → localhost:8080) 및 백엔드·프론트 동시 기동 확인

## 2. 백엔드: 인증 (auth)

- [x] 2.1 member 엔티티·리포지토리 (provider+provider_id UNIQUE, email nullable)
- [x] 2.2 Spring Security + OAuth2 Client 설정 — 카카오 provider 등록, 성공 시 회원 조회/생성(OAuth2UserService)
- [x] 2.3 JWT access 토큰 발급·검증 (HS256, 30분, sub=member id) 및 Bearer 인증 필터 — `/api/auth/**`·OAuth 경로 외 전부 보호
- [x] 2.4 refresh 토큰 서비스 — 불투명 토큰 생성, SHA-256 해시 저장(14일), HttpOnly 쿠키(Path=/api/auth) 설정, OAuth 성공 핸들러에서 발급 후 프론트 `/auth/callback` 리다이렉트
- [x] 2.5 `POST /api/auth/refresh` — 회전(기존 revoked 마킹+신규 발급, 조건부 UPDATE로 동시성 방어), 만료·무효 시 401+쿠키 만료, 회전된 토큰 재사용 시 회원 전체 토큰 무효화
- [x] 2.6 `POST /api/auth/logout` — 토큰 삭제 + 쿠키 만료
- [x] 2.7 인증 통합 테스트 — refresh 정상/만료/재사용 감지, 보호 API 401

## 3. 백엔드: 온보딩·프로필 (member)

- [x] 3.1 `DailyKcalCalculator` 순수 서비스 — Mifflin-St Jeor, 활동계수, 목표 조정(−500/+300/0), 하한선 클램프, 10 단위 반올림 + 단위 테스트
- [x] 3.2 weight_log 엔티티·리포지토리 (member_id+log_date UNIQUE, 최신 체중 조회)
- [x] 3.3 `GET /api/members/me` — 프로필+최신 체중+onboardingCompleted(daily_kcal_target null 판정)
- [x] 3.4 `POST /api/members/me/onboarding` — 입력 검증(키 100~230, 체중 30~250, 출생연도 1920~현재), 프로필 저장 + 오늘 weight_log 생성 + 확정 칼로리 저장 (트랜잭션)
- [x] 3.5 `GET /api/members/me/kcal-suggestion` — 입력값 기반 제안 칼로리 계산 (온보딩·프로필 수정 공용)
- [x] 3.6 `PATCH /api/members/me` — 키/목표체중/활동량/일일 칼로리 수정 (동일 검증 적용)
- [x] 3.7 온보딩·프로필 통합 테스트 — 정상 제출, 검증 실패 시 미저장, 수정 흐름

## 4. 프론트: 인증 흐름

- [ ] 4.1 API 클라이언트 — access 토큰 메모리 보관, 401 시 refresh 1회 후 재시도, 실패 시 로그인 화면 이동
- [ ] 4.2 로그인 화면 — 카카오 버튼(`{API}/oauth2/authorization/kakao` 이동), OAuth 실패 오류 표시
- [ ] 4.3 `/auth/callback` 페이지 — refresh 호출로 access 획득 → me 조회 → 온보딩 여부에 따라 분기
- [ ] 4.4 라우터 가드 — 미로그인은 로그인 화면, 온보딩 미완료는 온보딩 화면 강제, 앱 부트스트랩 시 refresh로 세션 복구

## 5. 프론트: 온보딩·프로필 화면

- [ ] 5.1 온보딩 화면 — 성별/출생연도/키/체중/목표체중/활동량 입력 폼 + 클라이언트 검증
- [ ] 5.2 제안 칼로리 표시·수정 스텝 — 제안값 조회, 사용자 수정 허용, 제출 → 홈 이동
- [ ] 5.3 프로필 화면 — 프로필·목표 조회, 수정 폼(변경 시 재계산 제안), 로그아웃 버튼
- [ ] 5.4 홈 화면 자리표시자 — 일일 칼로리 목표 표시 (후속 변경에서 대시보드로 확장)

## 6. 마무리 검증

- [ ] 6.1 카카오 개발용 OAuth 앱 등록 절차 README에 문서화 (리다이렉트 URI, 환경변수 목록)
- [ ] 6.2 E2E 수동 검증 — 신규 가입→온보딩→프로필 수정→로그아웃→재로그인 전체 흐름, 새로고침 세션 복구 확인
