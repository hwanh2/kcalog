# Tasks: redesign-app-shell

## 1. 디자인 토큰·5탭 셸 (app-shell)

- [ ] 1.1 Tailwind `@theme` 토큰 교체 — 템플릿(`docs/png/`)에서 색 추출(크림 배경·오렌지 primary·매크로 3색), 카드 라운드·타이포 갱신, 확정 hex를 design.md Open Questions에 기록
- [ ] 1.2 5탭 + 카메라 FAB 셸 — 홈/리포트/체중/AI PT 탭 + 중앙 FAB(촬영 흐름 진입, 저장 후 홈 복귀), 리포트·AI PT는 준비 중 화면, `/records` 라우트 제거, 프로필은 홈 헤더 아이콘 진입으로 이동
- [ ] 1.3 체중 탭 이식 — 기존 `WeightPanel`·`WeightTrend`를 체중 탭으로 이동(기능 회귀 없이)
- [ ] 1.4 셸 테스트 — 탭 이동·FAB 진입·준비 중 화면·온보딩 가드, 기존 셸 테스트 갱신

## 2. 백엔드: 탄단지 목표 (daily-dashboard)

- [ ] 2.1 매크로 목표 환산 순수 로직 — kcal 목표 → 탄 50/단 30/지 20 비율 g 환산(탄·단 4, 지 9kcal/g), TDD
- [ ] 2.2 `DashboardResponse`에 `carbTargetG/proteinTargetG/fatTargetG` 추가(목표 없으면 null) + 통합 테스트 갱신

## 3. 홈 리디자인 (daily-dashboard)

- [ ] 3.1 링 게이지·매크로 진행 바 — 남은 칼로리 링(섭취/목표 병기, 초과 시 위험 색·초과량), 탄단지 g 목표 대비 바, 인라인 SVG
- [ ] 3.2 체중 미니카드 — 최근 체중·7일 변화·목표까지 남은 kg·30일 스파크라인, 기록 없으면 유도 안내 (`weights`·`members/me` 재사용)
- [ ] 3.3 끼니 목록 + 날짜 이동 — 끼니 뱃지·시각·음식명·탄단지·kcal 표시, 기존 수정·삭제 UI 흡수(`RecordsPage` 제거), 헤더 날짜 이동(기본 오늘 KST)
- [ ] 3.4 촬영 유도 카드 — 당일 기록된 끼니 기준 다음 끼니 제안(순수 함수, TDD)
- [ ] 3.5 홈 화면 테스트 — 링·매크로 바·초과 상태·미니카드·끼니 수정/삭제 후 갱신·날짜 이동, 기존 `HomePage`·`RecordsPage` 테스트 재편

## 4. 마무리

- [ ] 4.1 전체 회귀 확인 — 프론트 테스트·tsc·oxlint·build, 백엔드 테스트 통과
- [ ] 4.2 설계 이탈 사항 design.md 반영, 색 토큰 확정값 기록
