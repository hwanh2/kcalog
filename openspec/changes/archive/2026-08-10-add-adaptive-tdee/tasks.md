# Tasks: add-adaptive-tdee

## 1. 순수 계산 (TDD)
- [x] 1.1 `TdeeCalc.reverse(meanIntake, trendDeltaKg, spanDays)` — 에너지수지 역산 + 테스트(감량/증량/유지)
- [x] 1.2 게이트 판정(커버리지·span) → OK/INSUFFICIENT + 테스트(경계)
- [x] 1.3 `DailyKcalCalculator`에서 maintenance→target 조정(감량−500/증량+300/유지0·하한·반올림)을 순수 메서드로 분리·재사용 + 테스트

## 2. 섭취 집계
- [x] 2.1 meal 리포지토리 — 기간 [from,to] 일별 총섭취 합계 조회(회원별)
- [x] 2.2 창 내 커버리지(섭취 기록일 수 / 창 일수) 계산

## 3. 서비스·API
- [x] 3.1 `TdeeService.get(memberId, asOf)` — 창 구성 → 추세(WeightTrend)·섭취 집계 → 게이트 → 실측/폴백 → 추천 목표
- [x] 3.2 `TdeeResponse` DTO(status, maintenanceKcal, source, currentTargetKcal, recommendedTargetKcal, windowDays, coverage)
- [x] 3.3 `TdeeController` `GET /api/tdee`
- [x] 3.4 통합 테스트 — 실측(OK)·폴백(INSUFFICIENT)·추천 목표·회원 미변경 검증

## 4. 프론트엔드
- [x] 4.1 `api/tdee.ts` — 타입 + `getTdee()`
- [x] 4.2 유지칼로리 카드 — 현재 유지칼로리·추천 목표·데이터 상태, "적용" → 기존 회원 PATCH 재사용
- [x] 4.3 홈 또는 체중 탭에 카드 배치 + 프론트 테스트(OK/INSUFFICIENT 분기·적용)

## 5. 마무리
- [x] 5.1 `./gradlew test` · `npm run build` · `npm test` · `openspec validate --strict` 통과
- [x] 5.2 design.md Open Questions 반영
