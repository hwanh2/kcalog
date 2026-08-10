# Tasks: enhance-weight-tab

## 1. 순수 계산 (TDD)
- [x] 1.1 `WeightTrend.ema(weights, alpha)` — EMA 시리즈 계산 + 단위 테스트(단일점·수렴·평활)
- [x] 1.2 `WeightStats.bmi(weightKg, heightCm)` — 값·분류(아시아 기준) + 경계 테스트(정상/과체중/비만/저체중, 신장 없음)
- [x] 1.3 `WeightStats.streak(datesAsc)` — 최신일부터 연속 일수 + 테스트(연속/공백/단일/없음)
- [x] 1.4 `WeightStats.project(dates, trend, targetKg, anchor)` — 예상 상태·날짜 + 테스트(도달/부족/평평/멀어짐/목표없음)

## 2. 서비스·API
- [x] 2.1 `BmiInfo`·`ProjectionInfo`·`WeightSummaryResponse` DTO
- [x] 2.2 `WeightService.summary(memberId, from, to)` — seed 버퍼로 EMA 데운 뒤 표시 구간 반환, BMI·streak·예상 조립
- [x] 2.3 `WeightController` `GET /api/weights/summary?from=&to=`
- [x] 2.4 통합 테스트 — 요약 응답(추세·BMI·streak·예상)·신장 없음·기록 없음 케이스

## 3. 프론트엔드
- [x] 3.1 `api/weight.ts` — `WeightSummary` 타입 + `getWeightSummary(from, to)`
- [x] 3.2 `WeightTrend` — 원시 점 위에 EMA 추세선 오버레이
- [x] 3.3 BMI — 백엔드 계산·응답 제공(탭 UI 미노출, 목업에 없음 — design 구현 이탈 참고)
- [x] 3.4 목표 예상 — status별 표시("약 N주 예상"/"데이터 부족"/"도달 어려움"/도달/목표 없음 숨김)
- [x] 3.5 streak 배지 — 히어로 카드 "🔥 N일 연속"
- [x] 3.6 `WeightPanel`/`WeightPage` 조립 + 프론트 테스트(요약 렌더·status 분기)

## 4. 마무리
- [x] 4.1 `./gradlew test` · `npm run build` · `npm test` · `openspec validate --strict` 통과
- [x] 4.2 design.md Open Questions·구현 이탈 반영
