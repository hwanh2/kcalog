# Proposal: redesign-app-shell

## Why

2026-08-10 재계획(`docs/2026-08-10-ai-diet-app-design.md`)으로 앱의 최종 IA가 5탭 + 카메라 FAB로 확정되었고, 디자인 시안 v2(`docs/png/01-home-v2-*.png`, 화면 기록 제공)가 기준으로 채택되었다. 이후 모든 화면 작업(리포트·AI PT·체중 고도화·비동기 분석)이 이 구조 위에 쌓이므로, 셸 재편과 홈 리디자인을 로드맵의 첫 change로 먼저 수행한다.

## What Changes

- 하단 네비게이션을 3탭(오늘/기록/프로필)에서 **5탭(홈·음식기록·체중·리포트·AI PT) + 우하단 플로팅 카메라 FAB**로 재편한다. 리포트·AI PT 탭은 이번 change에서는 "준비 중" placeholder 화면.
- 디자인 토큰을 v2 시안 기준(쿨그레이 배경·비비드 오렌지 primary·매크로 색상: 탄 앰버/단 레드/지 시안)으로 교체하고 전 화면에 적용한다.
- 홈 화면을 v2 시안 기준으로 리디자인한다: 헤더(프로필 진입)·날짜 이동, **오늘의 칼로리 카드**(남은 칼로리 링 게이지·섭취/목표·상태 배지), **탄단지 달성도 카드**(매크로별 g/목표 g·%·진행 바), **체중 추세 미니카드**(최근 체중·변화량·스파크라인), **오늘 기록한 식사 목록**(조회 전용, "전체보기"→음식기록 탭), **다음 끼니 촬영 유도 카드**. (AI 코칭·스트릭·활동 칼로리·사진 썸네일은 후속 change 범위)
- 기존 기록 탭은 **음식기록 탭으로 유지**(날짜별 조회·수정·삭제 그대로), 프로필은 홈 헤더 버튼으로 진입 경로를 옮긴다.
- 백엔드: 대시보드 응답에 **탄단지 목표(g)** 를 추가한다 — 일일 칼로리 목표에서 비율로 파생 계산(적응형 TDEE 도입 전까지의 기준값).
- 체중 탭은 기존 체중 입력·추이 위젯을 이식한다(고도화는 후속 `enhance-weight-tab`).

## Capabilities

### New Capabilities

(없음 — 기존 capability의 요구사항 변경으로만 구성)

### Modified Capabilities

- `app-shell`: 3탭 → 5탭 + 우하단 카메라 FAB로 네비게이션 요구 변경, 디자인 토큰을 v2 시안 기준으로 갱신, 프로필 진입 경로 변경
- `daily-dashboard`: 응답에 탄단지 목표(g) 추가, 홈 화면 구성 요소(링 게이지·매크로 달성도·체중 미니카드·오늘 식사 목록·촬영 유도) 요구 추가, 날짜 이동 요구 추가

## Impact

- 프론트: `AppShell`(탭 구조), 라우팅(`RecordsPage`·`ProfilePage` 재배치), `HomePage` 전면 재작성, Tailwind `@theme` 토큰 교체, `WeightPanel`/`WeightTrend` 이식, 관련 테스트 전반 수정
- 백엔드: `DashboardResponse`·`DashboardService`에 탄단지 목표 필드 추가(스키마 변경 없음 — 파생 계산)
- 스펙: `app-shell`, `daily-dashboard` 델타
- 후속 change 의존: 리포트·AI PT placeholder 탭은 `add-weekly-report`·`add-ai-coaching`에서 구현
