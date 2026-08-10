# enhance-weight-tab

## Why

체중 탭을 "입력 + 원시 점 그래프"에서 **의미 있는 통계·시각화 레이어**로 끌어올린다. 매일 체중은 노이즈(수분·식사)가 커서 원시값만으로는 추세를 읽기 어렵다. 가중이동평균 추세선·목표 도달 예상·BMI·연속 기록으로 "지금 잘 가고 있나?"를 한눈에 보여준다. 여기서 만드는 추세값(trend weight)은 다음 change(`add-adaptive-tdee`)의 입력이 된다. **이 change는 TDEE 역산을 하지 않는다** — 통계·표시까지만.

## What Changes

- **가중이동평균(EMA) 추세선** — 조회 구간의 일별 체중에 EMA(α≈0.1)를 얹어 추세값을 계산. 원시 점 + 추세선을 함께 표시.
- **목표 도달 예상** — 최근 추세 기울기로 `targetWeightKg` 도달 예상일 산출. 데이터 부족/추세가 목표에서 멀어지거나 평평하면 예상하지 않고 안내.
- **BMI** — 최신 체중 / (키m)². 대한비만학회(아시아-태평양) 분류. 신장 미입력 시 숨김.
- **연속 기록(streak)** — 최근 기록일 기준 연속 기록 일수.
- **백엔드 계산** — EMA·예상·BMI·streak를 순수 도메인 로직으로 계산(TDD), `GET /api/weights/summary`로 내려준다. 프론트는 렌더링만.
- **UI** — 체중 탭에 추세선 오버레이·BMI 카드·목표 예상·streak 배지 추가. 입력·날짜 선택은 유지.

## Impact

- Affected specs: `weight-tracking` (ADDED — 추세·요약)
- Affected code (backend): `WeightTrend`(EMA)·`WeightStats`(BMI·streak·예상) 순수 계산(신규, TDD), `WeightSummaryResponse` DTO, `WeightService.summary`, `WeightController` `GET /api/weights/summary`
- Affected code (frontend): `api/weight.ts`(summary 타입·호출), `WeightTrend`(추세선 오버레이), `WeightPanel`/`WeightPage`(BMI·예상·streak 표시)
- 마이그레이션: 없음 (추세는 비영속·조회 시 계산)
- 스코프 밖: TDEE 역산·적응형 목표(`add-adaptive-tdee`), 대시보드 미니카드 개편(기존 7일 delta 유지), 추세값 영속화
