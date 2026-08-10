# Proposal: add-auth-onboarding

## Why

MVP 설계(docs/2026-07-22-mvp-design.md)가 확정되었고, 모든 기능(식사 기록·대시보드·체중·운동·리포트)이 "로그인한 회원과 그 회원의 칼로리 목표"를 전제로 한다. 소셜 로그인과 온보딩(프로필·목표 설정)은 다른 모든 기능의 선행 조건이므로 첫 번째 변경으로 구현한다. 프론트/백엔드가 아직 scaffold되지 않았으므로 프로젝트 골격 구축도 이 변경에 포함한다.

## What Changes

- 프로젝트 scaffold: Spring Boot 3 백엔드(단일 모듈, JPA, Postgres), Vite + React SPA 프론트엔드(PWA, TanStack Query) 초기 구성
- 소셜 로그인: Spring Security + OAuth2 Client(카카오) 기반 로그인/로그아웃 — 구글 등 추가 provider는 추후 별도 변경
- 토큰 관리: JWT access 토큰(SPA 메모리 보관) + refresh 토큰(HttpOnly 쿠키, DB에 해시 저장) 발급·갱신
- 온보딩 플로우: 최초 로그인 시 성별/출생연도/키/체중/목표체중/활동량 입력 → 일일 칼로리 목표 자동 계산 → 사용자 수정 가능
- 데이터 모델: `member`, `refresh_token`, `weight_log`(온보딩 시 현재 체중을 첫 기록으로 저장) 테이블 생성
- 프로필 화면 최소 버전: 목표(키/체중/목표체중/활동량/일일 칼로리) 조회·수정, 로그아웃

## Capabilities

### New Capabilities

- `auth`: 카카오 OAuth2 소셜 로그인, JWT access/refresh 토큰 발급·갱신·만료 처리, 로그아웃
- `onboarding`: 최초 로그인 후 프로필·목표 입력 플로우, 일일 칼로리 목표 자동 계산(BMR·활동량 기반), 온보딩 완료 판정
- `member-profile`: 프로필·목표 조회 및 수정, 일일 칼로리 목표 재계산/수동 조정

### Modified Capabilities

(없음 — 최초 변경)

## Impact

- 신규 코드: `backend/`(Spring Boot 프로젝트 전체), `frontend/`(React SPA 전체)
- DB: Postgres 신규 스키마 — `member`, `refresh_token`, `weight_log` 테이블
- 외부 의존: 카카오 OAuth 앱 등록 및 클라이언트 키 발급 필요 (환경 변수로 관리)
- 이후 변경(`meal`, `weight`, `workout`, `report`)이 모두 이 변경의 회원·인증 기반 위에 쌓임
