# Design: add-weekly-report

## Context

현재: 리포트 탭은 `ComingSoonPage`. 재료는 모두 있음 — 식사 일별 집계(`MealService`/meal 리포지토리 범위 조회), 목표 매크로(`MacroTargetG.from(dailyKcalTarget)`), 체중 추세(`WeightTrend.ema`), 적응형 TDEE(`TdeeService`). 결정은 사용자 그릴링(2026-08-10) 확정. 인사이트는 **규칙 기반 신호 + 랭킹**(LLM은 다음 change).

## Decisions

### D1. 기간 = 주간/월간/총 토글 + 버킷 (사용자 요청으로 확장)
`GET /api/reports?period=WEEK|MONTH|TOTAL&anchor=YYYY-MM-DD`. anchor 생략 시 오늘(KST). 화살표 주 이동 대신 **기간 토글**.
- **버킷**: WEEK=요일별 7개(월~일), MONTH=일별(그 달), TOTAL=월별(첫 기록 달~이번 달).
- 각 버킷 값 = 그 구간 **기록일의 일 평균** 탄단지·kcal(비교 가능한 "하루치"). 분포는 버킷 스택 막대 + 탭 툴팁으로 표현.

### D2. 목표 달성 요약 (그릴링 확정)
- **달성일**: 하루 총섭취 기준. 감량 목표(targetWeight < 현재)면 `섭취 ≤ 목표`, 그 외(유지·증량)면 `|섭취 − 목표| ≤ 목표×10%`. 목표 없으면 달성 판정 불가(null).
- 반환: `onTargetDays`(달성일 수), `daysLogged`(기록일), `avgKcal`(기록일 평균), `targetKcal`.
- 성실도는 `daysLogged/7`로 프론트가 표기.

### D3. 탄단지 분포 (그릴링 확정)
- 기록일 평균 g(`avgCarbG/proteinG/fatG`) + 칼로리 비율(탄4·단4·지9 kcal 환산 후 %) + 목표 g(`MacroTargetG`).
- 인라인 SVG 도넛/바.

### D4. TDEE 변화 = 7일 일별 시리즈 (그릴링 확정)
`TdeeService.get(memberId, asOf)`로 주간 각 날짜의 TDEE를 계산해 시리즈로. 각 점은 `{date, maintenanceKcal, source}`(데이터 부족일은 공식 폴백값 또는 null). `TdeeService.get`을 asOf 인자로 확장(현재는 today 고정)해 임의 날짜 기준 트레일링 창으로 계산. 인라인 SVG 스파크라인.

### D5. 인사이트 = 신호 + 랭킹 (그릴링 확정 — A안)
1. **신호 계산(결정적)** — 주간에서 6~8개 신호를 구조화 값으로 산출:
   - 목표 달성일 수, 평균 섭취 vs 목표(초과/미달 kcal)
   - 단백질 목표 미달일 수, 지방 초과 연속일, 탄수 초과 연속일
   - 기록 성실도(기록일/7), 주간 체중 추세 변화, 평균 섭취 vs 유지칼로리(잉여/부족)
2. **랭킹** — 각 신호에 심각도 점수 → 상위 2~3개 선택(부정 신호 우선, 없으면 긍정 신호 하나).
3. **표현** — 신호당 템플릿 문구 1개(예: "지방을 3일 연속 목표보다 많이 먹었어요"). 규칙은 신호 수만큼(6~8개)이라 폭증하지 않는다.
- 신호는 구조화 데이터로 응답/내부에 두어 `add-ai-coaching`의 LLM 서술이 재사용.

### D6. 조회 시 계산 — 비영속 (그릴링 확정)
리포트 전용 테이블 없음. 입력(식사·체중·프로필)에서 매 조회 재계산. 다른 도메인(추세·TDEE)과 동일 원칙.

### D7. 데이터 부족 처리 (그릴링 확정)
기록일이 적으면 있는 집계만 반환. 목표 없으면 달성·비율만, TDEE 부족일은 폴백/누락 표시, 인사이트는 "데이터가 더 쌓이면 인사이트를 보여드려요".

### D8. 백엔드 순수 계산 TDD
집계·달성·분포·신호·랭킹을 순수 계산 클래스로 두고 TDD. 프론트는 `GET /api/reports/weekly` 결과 렌더만.

## Risks / Trade-offs

- [7일 TDEE 재계산 비용] → 하루 TDEE = 14일 창 조회. 7회면 개인 규모라 허용. 필요 시 창 데이터 한 번 로드 후 재사용 최적화.
- [규칙 인사이트의 경직성] → 신호 랭킹으로 관련 있는 것만, 표현은 템플릿. 풍부한 서술은 LLM change로 분리(신호 재사용).
- [달성 밴드 ±10% 임의성] → 상수로 두고 튜닝. 감량/유지 분기는 목표체중 방향으로.
- [주 경계·시간대] → KST 월~일. meal은 KST 날짜로 집계(기존 방식).

## Migration Plan

- 없음. 스키마 변경 없이 조회 시 계산.
- 라우팅에서 `/report` ComingSoon → 리포트 페이지로 교체.

## Open Questions (구현으로 확정)

- ~~신호 심각도·상위 개수~~ → 상위 **3**, 부정 우선·긍정 폴백(`WeeklyReportCalc.insights`).
- ~~달성 밴드~~ → 감량 목표는 `≤목표`, 그 외 `±10%`(`ON_TARGET_BAND`).
- ~~TDEE 부족일 표현~~ → 점은 `maintenanceKcal` null 가능(폴백값이 있으면 채움) + `source`. 프론트는 null 아닌 점만 스파크라인.

## 구현 이탈 (design 대비)

- **인사이트 신호 집합**: 이번엔 7개 구현(달성일·목표초과일·단백질미달일·지방연속초과·탄수연속초과·기록성실도·감량중잉여). **체중 추세 신호는 제외** — 결합·스코프 축소(체중 추세는 이미 체중 탭·TDEE에 반영). 신호는 구조화돼 있어 후속(LLM 코칭)에서 확장 가능.
- **TDEE 시리즈의 공식 폴백 현재 체중**: 과거 주의 폴백 시드가 전체 최신 체중을 참조할 수 있음(사소). 적응형이 되는 주에는 무관. 필요 시 asOf 이하 최신 체중 조회로 정밀화.
- **기간 확장(사용자 요청)**: 주간 전용에서 **주간/월간/총 버킷 리포트**로 확장. 엔드포인트 `/reports/weekly` → `/reports?period=`. TDEE 시리즈는 버킷별 대표일(월별=월말)로 계산 — MONTH(일별 ~30점)는 계산량이 있으나 개인 규모라 허용, TOTAL은 월별이라 소수 점.
- **매크로 분포 색**: 앱 공통 토큰(carb/protein/fat) 사용 — 목업의 초록/주황 대신 홈 MacroProgress와 일관.
- **인사이트 기간 스케일(리뷰 대응)**: `ReportCalc.insights(signals, period)`가 문구 스코프("이번 주/이번 달/전체 기간")와 임계값(부정 트리거는 기록일 비례 `max(3, ceil(days×0.4))`, 긍정은 달성 비율 ≥70%, 성실도는 rangeDays×0.5)을 기간에 맞춰 스케일. 클래스명 `WeeklyReportCalc → ReportCalc`.
- **일별 집계 공용화(리뷰 대응)**: 자정 경계·그룹핑을 `meal.service.MealDailyIntake`로 모아 Report/Tdee가 공유. kcal 계수(4/4/9)는 `meal.dto.MacroKcal` 공용 상수로.
- **연속 초과는 달력일 기준(리뷰 대응)**: 미기록일을 false로 채운 시퀀스에 `maxStreak` 적용(간극 무시 방지).
- **percent 음수 방지(리뷰 대응)**: largest-remainder 배분으로 합 100·음수 없음.
- **TdeePoint에 date 추가(리뷰 대응)**: spec D4의 "각 점은 날짜 포함"에 맞춰 `{label, date, maintenanceKcal, source}`.
- **TOTAL 첫 기록일**: 전체 로드 대신 `MealDailyIntake.earliestDate`(`findFirstByMemberIdOrderByEatenAtAsc`)로.
