# Design: redesign-app-shell

## Context

2026-08-10 재계획으로 최종 IA(5탭 + 카메라 FAB)와 화면 템플릿(`docs/png/`)이 확정됐다. 현재 구현은 3탭(오늘/기록/프로필) 셸 위에 대시보드·기록·체중 위젯이 얹혀 있다. 이 change는 구조(셸)와 첫 화면(홈)을 최종 형태로 바꾸되, 데이터 모델·API 파이프라인은 건드리지 않는다(비동기 분석·사진 저장은 후속 change).

## Decisions

### D1. 탭 구성과 기존 화면의 행선지
- 5탭: **홈 / 리포트 / (중앙 FAB: 촬영) / 체중 / AI PT** — 템플릿 하단 바와 동일.
- **기록 탭 폐지** → 날짜별 조회·수정·삭제는 홈으로 흡수: 홈 헤더에서 날짜 이동(이전/다음/피커), 끼니 목록 항목에서 수정·삭제. `RecordsPage`는 제거하고 `MealRow` 편집 UI는 홈으로 이동.
- **프로필 탭 폐지** → 홈 헤더 우측 아이콘으로 진입(`/profile` 라우트 유지). 템플릿의 알림 종 자리를 프로필 아이콘으로 사용(알림 기능 없음).
- **체중 탭**: 기존 `WeightPanel` + `WeightTrend` 이식만. `03-weight.png` 수준 고도화(가중이동평균·목표 예상)는 `enhance-weight-tab`에서.
- **리포트·AI PT 탭**: "준비 중" placeholder. 탭 자체를 숨기지 않는 이유 — 최종 IA를 처음부터 고정해 이후 change가 셸을 다시 만지지 않게 함.
- 중앙 FAB → 기존 `MealRecordPage`(촬영→분석→저장) 진입. 저장 후 홈으로 복귀.

### D2. 디자인 토큰 — Tailwind v4 `@theme` 교체
템플릿 팔레트 기준으로 기존 토큰을 교체: 크림 배경(`#FAF6EF` 계열), 서피스 화이트, primary 오렌지(`#E8602C` 계열), 매크로 색상 탄=오렌지·단=그린(`#3E9B4F` 계열)·지=옐로(`#D9A013` 계열), 성공 그린 배지·위험 레드 유지. 카드 라운드 크게(`rounded-card` 확대). 정확한 hex는 템플릿 png에서 추출해 구현 시 확정. 기존 화면(온보딩·프로필·촬영 흐름)은 토큰 교체의 영향만 받고 레이아웃 변경 없음.

### D3. 탄단지 목표 — 서버 파생 계산, 저장 없음
- 목표 매크로(g)는 `dailyKcalTarget`에서 비율로 파생: **탄 50% / 단 30% / 지 20%** (kcal 기준, 탄·단 4kcal/g, 지 9kcal/g → g 환산 후 반올림). 감량 목적의 일반적 권장 범위이며, 적응형 TDEE change(`add-adaptive-tdee`)에서 개인화로 대체될 기준값.
- Member 스키마에 저장하지 않고 `DashboardService`에서 계산해 `DashboardResponse`에 `carbTargetG/proteinTargetG/fatTargetG`(Integer, target 없으면 null)로 내려준다. 이유: 아직 사용자가 조정할 수 없는 파생값이라 저장하면 TDEE 도입 때 마이그레이션 부채가 됨.

### D4. 홈 화면 데이터 소스 — 기존 API 재사용
- 링 게이지·매크로 바·끼니 목록: 기존 `GET /api/dashboard?date=` (타임라인은 음식명 표시를 위해 기존 `GET /api/meals?date=`를 함께 사용 — 수정·삭제 UI가 meal 상세를 필요로 하므로 홈 끼니 목록은 meals 쿼리 기준, 상단 집계는 dashboard 기준).
- 체중 미니카드: 기존 `GET /api/weights?from=&to=`(30일) 재사용 — 최근 체중, 7일 전 대비 변화, `member.targetWeightKg`까지 남은 kg(`GET /api/members/me`), 스파크라인.
- 신규 API 없음. 백엔드 변경은 D3의 응답 필드 추가뿐.

### D5. 촬영 유도 카드
당일 기록된 끼니 구분(아침/점심/저녁)을 보고 다음 끼니를 제안하는 단순 규칙(시각 기반 기본값 재사용). 미기록 시 "아침을 촬영해 기록해요" 형태. 로직은 프론트 순수 함수로 두고 단위 테스트.

### D6. 링 게이지·스파크라인 — 인라인 SVG 유지
기존 `WeightTrend`와 동일하게 차트 라이브러리 없이 인라인 SVG(원호 `stroke-dasharray` 링, polyline 스파크라인). 의존성 최소화 방침 유지.

## Risks / Trade-offs

- [기록 탭 폐지로 과거 날짜 편집 동선이 홈 날짜 이동에 묶임] → 템플릿 IA와 일치하고, 리포트 탭이 생기면 과거 조회는 리포트에서 보완 가능. 1차 수용.
- [매크로 비율 50/30/20 고정] → 사용자 조정 불가는 한계지만 TDEE change에서 개인화 예정. design 문서에 기준 명시로 추적 가능.
- [placeholder 탭 2개 노출] → "준비 중" 화면이 미완성 인상을 줄 수 있으나, 셸 재작업 방지 이득이 더 큼.
- [홈이 dashboard+meals+weights 3개 쿼리 사용] → TanStack Query 캐시로 중복 호출 없음. 통합 API는 트래픽 문제가 생길 때 고려.

## Migration Plan

- DB 마이그레이션 없음. 백엔드는 응답 필드 추가(additive)라 프론트 구버전과도 호환.
- 프론트는 라우트 재배치(`/records` 제거, `/weight`·`/report`·`/ai-pt` 추가). PWA 정적 배포라 단순 교체.

## Open Questions

- 템플릿 정확한 색상 hex 추출값 → 구현(1.1)에서 확정해 `@theme`에 기록.
- 홈 날짜 이동 UI 형태(헤더 좌우 화살표 vs 날짜 피커) → 구현에서 템플릿 톤에 맞게 결정(둘 다 허용).
