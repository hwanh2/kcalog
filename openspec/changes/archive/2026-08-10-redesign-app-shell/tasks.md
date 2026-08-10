# Tasks: redesign-app-shell

## 1. 디자인 토큰·5탭 셸 (app-shell)

- [x] 1.1 Tailwind `@theme` 토큰 교체 — v2 시안에서 색 추출(쿨그레이 배경·비비드 오렌지·매크로 앰버/레드/시안), 카드 라운드·타이포 갱신, 확정 hex를 design.md Open Questions에 기록
- [x] 1.2 5탭 + 카메라 FAB 셸 — 홈/음식기록/체중/리포트/AI PT 탭 + 우하단 플로팅 FAB(촬영 흐름 진입, 저장 후 홈 복귀), 리포트·AI PT는 준비 중 화면, 프로필은 홈 헤더 버튼 진입으로 이동
- [x] 1.3 체중 탭 이식 — 기존 `WeightPanel`·`WeightTrend`를 체중 탭으로 이동(기능 회귀 없이)
- [x] 1.4 셸 테스트 — 탭 이동·FAB 진입·준비 중 화면·온보딩 가드, 기존 셸 테스트 갱신

## 2. 백엔드: 탄단지 목표 (daily-dashboard)

- [x] 2.1 매크로 목표 환산 순수 로직 — kcal 목표 → 탄 50/단 30/지 20 비율 g 환산(탄·단 4, 지 9kcal/g), TDD (`MacroTargetG`, 4 케이스)
- [x] 2.2 `DashboardResponse`에 `carbTargetG/proteinTargetG/fatTargetG` 추가(목표 없으면 null) + 통합 테스트 갱신(목표 미설정 회원 케이스 추가)

## 3. 홈 리디자인 (daily-dashboard)

- [x] 3.1 오늘의 칼로리 카드 — 남은 칼로리 링 게이지(섭취/목표 병기·상태 배지, 초과 시 위험 색·초과량), 인라인 SVG (`CalorieRing`)
- [x] 3.2 탄단지 달성도 카드 — 매크로별 섭취 g/목표 g·달성률(%)·진행 바(앰버/로즈/시안) (`MacroProgress`)
- [x] 3.3 체중 미니카드 — 최근 체중·변화량·30일 스파크라인, 기록 없으면 유도 안내 (`WeightMiniCard`+`weightSummary` TDD)
- [x] 3.4 오늘 식사 목록 + 날짜 이동 — 끼니 뱃지·시각·음식명·매크로 칩·kcal(조회 전용, `getMeals`), "전체보기"→음식기록 탭, 날짜 이동(기본 오늘 KST). `RecordsPage`는 음식기록 탭으로 유지
- [x] 3.5 촬영 유도 카드 — 당일 기록된 끼니 기준 다음 끼니 제안(`suggestNextMealType` 순수 함수, TDD)
- [x] 3.6 홈 화면 테스트 — 링·매크로 달성도·초과 상태·미니카드·전체보기 진입·날짜 이동, 기존 `HomePage` 테스트 재편

## 4. 마무리

- [x] 4.1 전체 회귀 확인 — 프론트 테스트(97)·tsc·oxlint·build, 백엔드 테스트 통과
- [x] 4.2 설계 이탈 사항 design.md 반영, 색 토큰 확정값 기록
