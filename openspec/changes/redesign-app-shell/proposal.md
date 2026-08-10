# Proposal: redesign-app-shell

## Why

2026-08-10 재계획(`docs/2026-08-10-ai-diet-app-design.md`)으로 앱의 최종 IA가 5탭(홈/리포트/체중/AI PT + 중앙 카메라 FAB)으로 확정되었고, 화면 디자인 템플릿(`docs/png/`)이 마련되었다. 이후 모든 화면 작업(리포트·AI PT·체중 고도화·비동기 분석)이 이 구조 위에 쌓이므로, 셸 재편과 홈 리디자인을 로드맵의 첫 change로 먼저 수행한다.

## What Changes

- 하단 네비게이션을 3탭(오늘/기록/프로필)에서 **5탭 구조(홈·리포트·체중·AI PT) + 중앙 카메라 FAB**로 재편한다. 리포트·AI PT 탭은 이번 change에서는 "준비 중" placeholder 화면.
- 디자인 토큰을 템플릿 기준(크림 배경·오렌지 primary·매크로 색상: 탄 오렌지/단 그린/지 옐로)으로 교체하고 전 화면에 적용한다.
- 홈 화면을 `01-home.png` 기준으로 리디자인한다: 날짜·인사 헤더, **남은 칼로리 링 게이지**(섭취/목표), **탄단지 목표 대비 진행 바**, **체중 추세 미니카드**(최근 체중·7일 변화·목표까지 남은 kg·스파크라인), **끼니 목록**(끼니 뱃지·시각·음식명·탄단지·kcal, 수정·삭제 유지), **다음 끼니 촬영 유도 카드**. (AI 코칭 카드·활동 칼로리·사진 썸네일은 후속 change 범위)
- 기존 "기록 탭"의 날짜별 조회·수정·삭제 기능은 홈의 날짜 이동 + 끼니 목록으로 흡수하고, 프로필은 홈 헤더 아이콘으로 진입 경로를 옮긴다.
- 백엔드: 대시보드 응답에 **탄단지 목표(g)** 를 추가한다 — 일일 칼로리 목표에서 비율로 파생 계산(적응형 TDEE 도입 전까지의 기준값).
- 체중 탭은 기존 체중 입력·추이 위젯을 이식한다(고도화는 후속 `enhance-weight-tab`).

## Capabilities

### New Capabilities

(없음 — 기존 capability의 요구사항 변경으로만 구성)

### Modified Capabilities

- `app-shell`: 3탭 → 5탭 + 중앙 카메라 FAB로 네비게이션 요구 변경, 디자인 토큰을 템플릿 기준으로 갱신, 프로필 진입 경로 변경
- `daily-dashboard`: 응답에 탄단지 목표(g) 추가, 홈 화면 구성 요소(링 게이지·매크로 진행 바·체중 미니카드·촬영 유도) 요구 추가, 날짜 이동 요구 추가

## Impact

- 프론트: `AppShell`(탭 구조), 라우팅(`RecordsPage`·`ProfilePage` 재배치), `HomePage` 전면 재작성, Tailwind `@theme` 토큰 교체, `WeightPanel`/`WeightTrend` 이식, 관련 테스트 전반 수정
- 백엔드: `DashboardResponse`·`DashboardService`에 탄단지 목표 필드 추가(스키마 변경 없음 — 파생 계산)
- 스펙: `app-shell`, `daily-dashboard` 델타
- 후속 change 의존: 리포트·AI PT placeholder 탭은 `add-weekly-report`·`add-ai-coaching`에서 구현
