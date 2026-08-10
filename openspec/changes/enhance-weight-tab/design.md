# Design: enhance-weight-tab

## Context

현재: `WeightLog(member_id, log_date, weight_kg)` 하루 1회 upsert + `GET /api/weights?from=&to=`(원시 목록). 프론트가 원시 점을 SVG로 그리고, 대시보드 미니카드는 프론트에서 7일 delta를 계산(`weightSummary.ts`). 프로필에 `heightCm`·`targetWeightKg`가 이미 있다(BMI·목표 예상 재료). 결정은 사용자 그릴링(2026-08-10)으로 확정.

## Decisions

### D1. 추세는 비영속 — 조회 시 계산 (그릴링 확정)
`weight_log`에 trend 컬럼을 두지 않고, 요약 조회 시 EMA를 계산한다. EMA는 순차 의존이라 충분한 히스토리만 불러오면 정확하고, 과거 편집·삭제·삽입에도 자동으로 맞다(백필 불필요). 설계 문서의 `trend_weight` 영속화안 대비 트레이드오프: 매 조회 재계산(값이 작아 무시 가능) vs 마이그레이션·백필·정합성 로직 제거. TDEE change가 추세를 쓸 때도 같은 계산을 재호출하면 된다.

### D2. 계산은 백엔드 — 순수 도메인 TDD (그릴링 확정)
EMA·BMI·streak·예상을 서비스 계층의 순수 계산 클래스로 두고 TDD한다(AGENTS.md: 계산·판정은 스펙 시나리오를 실패 테스트로 먼저). 프론트는 `GET /api/weights/summary` 결과를 렌더링만. 이유: 설계 문서가 "백엔드 단위: 가중이동평균"을 명시하고, 추세 계산을 TdeeService가 재사용한다. 기존 프론트 `weightSummary`(대시보드 7일 delta)는 이번 범위 밖 — 유지(EMA 로직 중복 안 만든다).

### D3. 이동평균 = EMA(α≈0.1)
지수이동평균: `trend[0] = weight[0]`, `trend[i] = trend[i-1] + α·(weight[i] − trend[i-1])`. α는 상수(기본 0.1, ≈10일 span — Trendweight·Hacker's Diet 관례). 결측일은 보간하지 않고 기록된 날만 시퀀스로 본다(간격 불균일 허용, MVP). 조회 구간 시작점의 seed 오차를 줄이려 서비스는 표시 구간보다 앞선 seed 버퍼(예: from−30일)까지 조회해 EMA를 데운 뒤, 표시 구간만 반환한다.

### D4. 목표 도달 예상
- 최근 14일 추세점에 대한 단순선형회귀 기울기 `slope`(kg/day)를 구한다.
- `targetWeightKg`가 null → `NO_GOAL`.
- 데이터가 14일 미만(구간 내 기록일 수 부족) → `INSUFFICIENT_DATA`.
- 목표 방향과 추세가 반대이거나 기울기가 거의 0(|slope| < ε, 예: 0.005kg/day) → `NOT_APPROACHING`(무한대·과거일 방지).
- 그 외 → `days = (target − latestTrend) / slope`, `projectedDate = today + days`, `weeks ≈ round(days/7)`. status `ON_TRACK`.
- 회귀·기울기는 trend(평활값) 기준으로 — 원시값보다 안정적.

### D5. BMI — 아시아-태평양 기준
`bmi = weightKg / (heightCm/100)²`, 소수 1자리. 분류(대한비만학회): `<18.5 저체중`, `18.5~22.9 정상`, `23~24.9 과체중`, `≥25 비만`. `heightCm`가 null이면 BMI를 계산·표시하지 않는다(응답 필드 null). 최신 원시 체중 기준(추세값 아님 — 사용자가 방금 잰 값과 일치하게).

### D6. streak — 연속 기록 일수
최신 기록일부터 하루씩 뒤로 가며 연속으로 기록이 있는 날을 센다(첫 공백에서 멈춤). "N일 연속 기록"으로 동기 부여. 기준 시간대는 KST(서버 `Clock`이 이미 Asia/Seoul). 예: 8/10·8/9·8/8 기록·8/7 없음 → streak 3. 오늘 미기록이어도 최신일 기준 run을 보여준다(사용자가 매일 저녁 기록하는 패턴 배려).

### D7. API — `GET /api/weights/summary`
`?from=&to=`(기존 history와 동일 파라미터). 응답 `WeightSummaryResponse`:
```
{
  points: [{ logDate, weightKg, trendKg }],   // 표시 구간, EMA는 seed 버퍼로 데워짐
  latestKg, latestTrendKg,                     // 없으면 null
  bmi: { value, category } | null,             // 신장 없으면 null
  streakDays: int,
  projection: { status, targetKg, projectedDate?, weeks? }
}
```
기존 `GET /api/weights`(원시 목록)는 유지(입력 폼·수정에서 특정일 값 확인에 사용).

## Risks / Trade-offs

- [조회 시 EMA 재계산 비용] → 데이터가 작고(개인 일별) seed 버퍼도 짧아 무시 가능. 캐싱 불필요.
- [seed 구간 edge 오차] → from−30일 버퍼로 완화. 표시 구간 첫 점의 미세 오차는 허용(추세는 평활 표시용).
- [불균일 간격(결측일)] → 보간 없이 기록일 시퀀스로 EMA(MVP). 장기 공백 후 첫 값이 튈 수 있으나 이후 수렴. 보간은 후속.
- [예상의 과신] → 가드(데이터 부족/미접근/평평)로 허황된 날짜를 막고, UI는 "예상"임을 명시.
- [BMI 아시아 기준] → 한국 사용자 전제. 국제화 시 기준 선택 옵션은 후속.

## Migration Plan

- 없음. 스키마 변경 없이 조회 시 계산.
- `AppProperties`에 EMA α·streak 등 상수를 둘지: 기본은 계산 클래스 상수로 두고(불필요한 설정 회피), 튜닝 필요 시 승격.

## Open Questions (구현으로 확정)

- ~~seed 버퍼 크기~~ → **30일 고정**(`WeightService.SEED_BUFFER_DAYS`).
- ~~회귀 창~~ → **최근 14개 점**(`WeightStats.MIN_POINTS_FOR_PROJECTION`) 미만이면 INSUFFICIENT_DATA, 이상이면 마지막 14개로 최소제곱 기울기.
- ~~trend 반올림~~ → 내부 계산 double, 응답은 소수 1자리(`round1`).

## 구현 이탈 (design 대비)

- **표시 구간 90일**: 프론트 체중 탭은 `[date−89, date]`(90일)를 조회한다(추세·예상에 충분한 점 확보). 서버는 여기에 seed 30일을 더 붙여 EMA를 데운다.
- **streak 계산 범위**: streak는 조회된 구간(seed 30 + 표시 90 = 120일) 내 날짜로 계산한다. 120일을 넘는 연속 기록은 과소 집계될 수 있으나(극단 케이스) MVP 허용 — 필요 시 전체 히스토리 조회로 승격.
- **이미 목표 도달**: 잔여 |target−latestTrend| < 0.1kg이면 ON_TRACK(예상일=최신일, 0주)로 처리(NOT_APPROACHING 오탐 방지).
- **UI(사용자 목업 반영)**: 체중 기록 카드를 오렌지 그라데이션 히어로 카드(흰 큰 숫자 + −0.1/＋0.1 반투명 버튼 + 크림색 저장)로, 목표 에스티메이터는 다크 카드(진행바 brand→carb 그라데이션·예상일 carb 강조)로 구성. 상단 날짜 선택 캘린더 제거 — 탭은 **오늘** 기록 전용(과거일 수정은 후속). BMI는 목업에 없어 탭 UI엔 노출 안 함(백엔드 응답엔 유지). 변화 지표는 "지난주 대비"가 아니라 **"어제보다"(직전 기록 대비)**로 표기.
- **weeklyRateKg 추가**: 에스티메이터 페이스("주당 평균 −0.42kg") 표시용으로 `ProjectionInfo.weeklyRateKg`(slope×7)를 ON_TRACK 시 채운다.
