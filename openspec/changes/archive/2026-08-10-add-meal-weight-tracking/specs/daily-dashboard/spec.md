# daily-dashboard

## ADDED Requirements

### Requirement: 하루 섭취 요약
시스템은 회원의 특정 날짜 식사 기록을 집계해 총 섭취 칼로리·탄수화물·단백질·지방을 제공해야 한다(SHALL). 집계는 해당일 회원 소유 meal 기록만 대상으로 해야 한다(MUST).

#### Scenario: 오늘 요약 조회
- **WHEN** 회원이 `GET /api/dashboard?date=YYYY-MM-DD`를 호출하면
- **THEN** 해당일 총 섭취 칼로리와 탄단지 합계를 반환한다

#### Scenario: 기록 없는 날
- **WHEN** 해당일 식사 기록이 없으면
- **THEN** 모든 합계가 0인 요약을 반환한다

### Requirement: 목표 대비 잔여와 구성 비율
시스템은 회원의 일일 칼로리 목표 대비 잔여 칼로리와, 탄단지 구성 비율을 산출할 수 있는 탄단지 gram 합계를 제공해야 한다(SHALL). 목표를 초과하면 잔여는 음수로 표현해야 한다(MUST). 구성 비율(%) 자체는 gram 합계로부터 클라이언트가 파생한다 — 서버는 gram 합계만 authoritative로 반환한다(design D6).

#### Scenario: 잔여 칼로리
- **WHEN** 대시보드를 조회하면
- **THEN** `daily_kcal_target − 총 섭취`를 잔여 칼로리로, 탄단지 gram 합계와 함께 반환한다

#### Scenario: 목표 초과
- **WHEN** 총 섭취가 목표를 초과하면
- **THEN** 잔여 칼로리를 음수로 반환한다

### Requirement: 식사 타임라인
시스템은 해당일 식사 기록을 시간 순 목록으로 제공해 대시보드에 타임라인으로 표시할 수 있게 해야 한다(SHALL). 각 항목은 섭취 시각·끼니 구분·총 칼로리를 포함해야 한다(MUST).

#### Scenario: 타임라인 표시
- **WHEN** 대시보드를 조회하면
- **THEN** 해당일 식사가 섭취 시각 순으로, 끼니 구분과 총 칼로리와 함께 반환된다
