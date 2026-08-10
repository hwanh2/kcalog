# add-adaptive-tdee

## Why

차별점 #2 "적응형 유지칼로리". 온보딩의 공식 TDEE(Mifflin-St Jeor × 활동계수, `DailyKcalCalculator`)는 개인차·실제 대사를 못 잡는다. **실제 체중 추세 + 섭취량**으로 에너지수지식을 역산해 그 사람의 실측 유지칼로리를 구하고, 목표를 데이터 기반으로 추천한다(MacroFactor식). 방금 만든 체중 추세(EMA)와 기존 식사 섭취 집계를 그대로 소비한다.

## What Changes

- **실측 TDEE 역산** — 트레일링 창(기본 14일)의 `평균 일일섭취 − 일일 추세체중변화 × 7700kcal/kg`로 유지칼로리를 계산.
- **불완전 로깅 폴백** — 창 내 섭취 로깅 커버리지가 임계(기본 80%) 미만이거나 추세를 낼 체중 기록이 부족하면 실측을 내지 않고 **공식 TDEE로 폴백**하며 "데이터 더 필요"를 알린다.
- **추천 목표 (자동 아님)** — 실측 TDEE + 목표 조정(감량−500/증량+300/유지0, `DailyKcalCalculator` 정책 재사용)으로 추천 목표를 산출해 **표시**하고, 사용자가 원탭으로 적용할 때만 `dailyKcalTarget`을 갱신한다.
- **조회 시 계산(비영속)** — 입력(체중로그·식사)이 모두 저장돼 있어 임의 날짜의 TDEE를 조회 시 재계산한다. `tdee_estimate` 테이블·스케줄 잡 없음.
- **API·UI** — `GET /api/tdee`(현재 실측/공식 TDEE·추천 목표·데이터 상태). 홈/체중 탭에 작은 카드(유지칼로리·추천 목표·적용).

## Impact

- Affected specs: `adaptive-tdee` (신규 capability)
- Affected code (backend): `TdeeService`(역산·상태 판정, 순수 계산 TDD), `TdeeResponse` DTO, `TdeeController` `GET /api/tdee`; 섭취 일별 집계 조회(meal 리포지토리 범위 합계), 체중 추세(`WeightTrend`) 재사용, `DailyKcalCalculator` 조정 정책 재사용
- Affected code (frontend): `api/tdee.ts`, 유지칼로리 카드(추천 목표·적용 → 기존 회원 PATCH 재사용)
- 마이그레이션: 없음 (조회 시 계산)
- 스코프 밖: 목표 자동 갱신(추천만), 주간 리포트 TDEE 차트(`add-weekly-report`), AI 코칭(`add-ai-coaching`), 매크로(탄단지) 재분배
