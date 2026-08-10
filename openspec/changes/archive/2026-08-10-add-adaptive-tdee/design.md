# Design: add-adaptive-tdee

## Context

현재: 온보딩이 `DailyKcalCalculator.suggest`(Mifflin-St Jeor BMR × 활동계수 + 감량−500/증량+300/유지0, 하한·10단위 반올림)로 초기 `dailyKcalTarget`을 제안. 섭취는 `MealService.findByDate`로 일별 합계 집계 가능. 체중 추세는 `WeightTrend.ema`(enhance-weight-tab). 프로필: gender·birthYear·heightCm·activityLevel·targetWeightKg·dailyKcalTarget. 결정은 사용자 그릴링(2026-08-10) 확정.

## Decisions

### D0. 역산 모델 — 에너지수지식 (그릴링 확정)
`섭취 − 소비 = 체지방 에너지 변화`. 트레일링 창 N일:
```
adaptiveTDEE = meanDailyIntake − (ΔtrendWeight / spanDays) × KCAL_PER_KG
```
- `meanDailyIntake` = 창 내 섭취 기록이 있는 날의 일일 총섭취 평균 (결측일은 평균으로 대표 — 커버리지 게이트가 대표성 보장).
- `ΔtrendWeight` = 창 내 EMA 추세값의 (마지막 − 처음), `spanDays` = 두 추세 기준일 간 일수 → 일일 추세 변화(kg/day).
- `KCAL_PER_KG = 7700`(체지방 1kg).
- 감량 중이면 Δ<0 → 소비 > 섭취 → TDEE > 섭취. 증량이면 반대.

### D1. 창·최소 데이터·불완전 로깅 폴백 (그릴링 확정)
- 창: 최근 14일 트레일링(`WINDOW_DAYS`, 튜닝 가능). 추세 seed는 `WeightTrend`가 이전 히스토리로 데운다.
- **게이트(모두 충족해야 실측)**: ① 창 내 섭취 로깅 커버리지 ≥ 80%(`MIN_COVERAGE`) ② 추세 양끝을 낼 체중 기록이 있고 `spanDays ≥ 최소 span`(기본 10일). 
- 미충족 → 실측을 내지 않고 **공식 TDEE(`DailyKcalCalculator`의 BMR×factor 부분)로 폴백**, 상태 `INSUFFICIENT_DATA`.
- 이유: 섭취 로깅이 성기면 Σ가 과소추정돼 TDEE가 부풀려진다. 게이트로 엉터리 값 차단.

### D2. 추천 목표 — 자동 아님, 원탭 적용 (그릴링 확정)
실측 TDEE + 목표 조정(`DailyKcalCalculator`와 동일: 감량−500/증량+300/유지0, 하한·10단위 반올림)으로 `recommendedTarget` 산출. **자동으로 `dailyKcalTarget`을 바꾸지 않는다.** 응답에 현재 목표·추천 목표를 함께 담고, 사용자가 적용하면 **기존 회원 PATCH(`UpdateMemberRequest.dailyKcalTarget`)로 반영**. 자동 갱신의 놀람·통제감 상실을 피한다.

### D3. 비영속 — 조회 시 계산 (그릴링 확정)
`tdee_estimate` 테이블·스케줄 잡을 두지 않는다. 입력(체중로그·식사)이 모두 저장돼 있어 임의 날짜의 TDEE를 그 날짜 기준 트레일링 창으로 재계산 가능. 리포트의 "TDEE 변화"도 날짜별 재계산으로 낸다. 체중 추세와 동일 원칙(마이그레이션·백필·정합성 로직 제거). 설계 문서의 `tdee_estimate` 영속안 대비 트레이드오프: 재계산 비용(개인 규모라 무시) vs 스키마·잡 제거.

### D4. 계산은 백엔드 순수 로직 — TDD
`TdeeService`(+ 순수 계산 클래스)로 역산·게이트·추천을 계산하고 TDD. 섭취 일별 합계는 meal 리포지토리 범위 조회(신규 집계 쿼리), 추세는 `WeightTrend.ema` 재사용, 조정은 `DailyKcalCalculator` 재사용. 프론트는 `GET /api/tdee` 결과 렌더만.

### D5. API — `GET /api/tdee`
```
{
  status: "OK" | "INSUFFICIENT_DATA",
  maintenanceKcal: int | null,     // 실측 유지칼로리(OK일 때), 폴백 시 공식 TDEE
  source: "ADAPTIVE" | "FORMULA",  // 실측 vs 공식 시드
  currentTargetKcal: int | null,   // member.dailyKcalTarget
  recommendedTargetKcal: int,      // maintenance + 조정
  windowDays: int, coverage: number // 데이터 상태 표시용
}
```
적용은 별도 엔드포인트 없이 기존 `PATCH /api/members`(dailyKcalTarget) 재사용.

## Risks / Trade-offs

- [섭취 로깅 성김 → TDEE 왜곡] → 커버리지 게이트로 폴백. 실측을 못 내면 공식 TDEE로 안전하게.
- [단기 창의 노이즈] → 추세(EMA)로 체중 노이즈 제거, meanIntake 평균화. 창이 짧아도 게이트가 최소 신뢰 보장. 창 길이·게이트는 튜닝 상수.
- [7700kcal/kg 단순화] → 개인·구성 변동 무시하는 표준 근사. MVP 허용, 후속에 개인화 여지.
- [자동 미보정으로 목표가 옛날 값에 머묾] → 추천 카드로 적용 유도. 자동 갱신은 신뢰 확보 후 옵션으로.
- [조회 시 재계산 비용] → 개인 데이터라 작음. 리포트 범위 계산도 O(일수) 수준.

## Migration Plan

- 없음. 스키마 변경 없이 조회 시 계산.
- 상수(`WINDOW_DAYS=14`, `MIN_COVERAGE=0.8`, `MIN_SPAN_DAYS=10`, `KCAL_PER_KG=7700`)는 계산 클래스 상수로 두고 필요 시 설정 승격.

## Open Questions (구현으로 확정)

- ~~창 길이~~ → **14 고정**(`TdeeCalc.WINDOW_DAYS`).
- ~~커버리지 분모~~ → **창의 달력일 수**(WINDOW_DAYS) 기준 커버리지.
- ~~`DailyKcalCalculator` 재사용 형태~~ → `maintenance(...)`(BMR×factor)·`toTarget(maintenance,...)`(조정·하한·반올림)로 **순수 메서드 분리**, `suggest`는 둘의 합성. `TdeeService`가 폴백 시드·추천 목표에 재사용.

## 구현 이탈 (design 대비)

- **계산 순서 = 적응형 우선**: 적응형 역산(섭취 − 체중변화)은 프로필이 필요 없으므로 **먼저 시도**한다. ①적응형(섭취 커버리지·체중 추세만 충족하면 프로필 없이도 OK) → ②안 되면 공식 폴백(gender·birthYear·heightCm·activityLevel + 최신 체중 필요) → ③둘 다 불가면 `INSUFFICIENT_DATA`(maintenance·recommended null). "계산이 되면 유지칼로리는 무조건 나온다"가 목표. 추천 목표는 목표체중·성별·현재 체중이 있어야 산출(없으면 유지칼로리만).
- **UI 위치**: 유지칼로리 카드를 **체중 탭**(WeightPage)에 배치 — 체중 추세·섭취에서 나온 지표라 맥락이 맞고 홈을 단순하게 유지. "적용"은 기존 `PATCH /api/members/me`(dailyKcalTarget) 재사용, 별도 엔드포인트 없음.
