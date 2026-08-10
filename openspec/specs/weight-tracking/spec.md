# weight-tracking Specification

## Purpose
TBD - created by archiving change add-meal-weight-tracking. Update Purpose after archive.
## Requirements
### Requirement: 체중 입력 (하루 1회 upsert)
시스템은 회원이 특정 날짜의 체중을 기록할 수 있게 해야 한다(SHALL). 같은 날짜에 다시 입력하면 기존 값을 덮어써야 한다(MUST, upsert). 날짜를 지정하지 않으면 오늘 날짜로 기록해야 한다(SHALL). 체중은 허용 범위(30~250kg)를 검증해야 한다(MUST).

#### Scenario: 오늘 체중 기록
- **WHEN** 회원이 체중만 담아 `POST /api/weights`를 호출하면
- **THEN** 오늘 날짜의 weight_log가 생성되거나 기존 값이 갱신된다

#### Scenario: 같은 날 재입력
- **WHEN** 회원이 이미 기록한 날짜에 다른 체중을 입력하면
- **THEN** 행이 추가되지 않고 해당 날짜 값이 덮어써진다(1행 유지)

#### Scenario: 범위 밖 체중
- **WHEN** 체중이 30~250kg를 벗어나면
- **THEN** 400과 오류를 반환하고 저장하지 않는다

### Requirement: 체중 추이 조회
시스템은 회원이 기간을 지정해 자신의 체중 기록을 조회할 수 있게 해야 한다(SHALL). 결과는 날짜 순으로 반환해야 한다(MUST).

#### Scenario: 기간별 조회
- **WHEN** 회원이 `GET /api/weights?from=&to=`를 호출하면
- **THEN** 해당 기간 자신의 체중 기록을 날짜 오름차순으로 반환한다

#### Scenario: 최신 체중
- **WHEN** 프로필·대시보드가 최신 체중을 필요로 하면
- **THEN** 가장 최근 날짜의 weight_log 값을 제공한다

### Requirement: 체중 추세(가중이동평균)
시스템은 조회 구간의 일별 체중에 지수이동평균(EMA)을 적용해 추세값을 제공해야 한다(SHALL). 추세는 영속화하지 않고 조회 시 계산해야 하며(MUST), 표시 구간 시작점의 seed 오차를 줄이기 위해 구간 이전 히스토리로 EMA를 데운 뒤 표시 구간만 반환해야 한다(MUST). 각 표시 점은 원시 체중과 추세값을 함께 포함해야 한다(MUST).

#### Scenario: 추세값 계산
- **WHEN** 회원이 `GET /api/weights/summary?from=&to=`를 호출하면
- **THEN** 표시 구간의 각 날짜에 대해 원시 체중과 EMA 추세값이 함께 반환된다

#### Scenario: 기록 없음
- **WHEN** 구간에 체중 기록이 하나도 없으면
- **THEN** 빈 점 목록과 함께 최신값·추세·BMI·예상이 비어 있음을 반환한다(오류 아님)

### Requirement: BMI
시스템은 최신 체중과 회원 신장으로 BMI를 계산해 제공해야 한다(SHALL). 분류는 아시아-태평양 기준(저체중 <18.5 / 정상 / 과체중 23~24.9 / 비만 ≥25)을 사용해야 한다(MUST). 신장이 없으면 BMI를 계산·반환하지 않아야 한다(MUST NOT).

#### Scenario: BMI 계산·분류
- **WHEN** 신장이 있는 회원의 요약을 조회하면
- **THEN** 최신 체중 기준 BMI 값과 분류가 반환된다

#### Scenario: 신장 없음
- **WHEN** 신장이 입력되지 않은 회원의 요약을 조회하면
- **THEN** BMI는 비어 있음(null)으로 반환된다

### Requirement: 목표 도달 예상
시스템은 최근 체중 추세로 목표 체중 도달을 예상해 제공해야 한다(SHALL). 목표가 없으면 예상하지 않아야 하고(MUST), 데이터가 부족하거나(설정 최소일 미만) 추세가 목표에서 멀어지거나 평평하면 예상 날짜를 내지 않고 사유 상태를 반환해야 한다(MUST — 허황된 날짜 방지).

#### Scenario: 도달 예상
- **WHEN** 목표가 있고 추세가 목표 방향으로 충분히 움직이면
- **THEN** 목표 도달 예상일(및 대략 주 수)을 반환한다

#### Scenario: 데이터 부족
- **WHEN** 추세를 낼 만큼 기록이 쌓이지 않았으면
- **THEN** 예상 날짜 대신 "데이터 부족" 상태를 반환한다

#### Scenario: 목표에 접근하지 않음
- **WHEN** 추세가 목표에서 멀어지거나 사실상 평평하면
- **THEN** 예상 날짜 대신 "접근하지 않음" 상태를 반환한다

#### Scenario: 목표 없음
- **WHEN** 회원이 목표 체중을 설정하지 않았으면
- **THEN** 예상은 "목표 없음" 상태로 반환된다

### Requirement: 연속 기록(streak)
시스템은 최신 기록일부터 연속으로 기록된 일수를 제공해야 한다(SHALL). 첫 공백일에서 멈춰야 하며(MUST), 기준 시간대는 서비스 시간대(KST)여야 한다(MUST).

#### Scenario: 연속 일수 계산
- **WHEN** 최신 기록일부터 하루 간격으로 연속 기록이 있으면
- **THEN** 그 연속 일수가 streak로 반환된다

#### Scenario: 공백으로 끊김
- **WHEN** 연속 기록 중간에 기록이 빠진 날이 있으면
- **THEN** 최신일부터 첫 공백 전까지의 일수만 streak로 센다

