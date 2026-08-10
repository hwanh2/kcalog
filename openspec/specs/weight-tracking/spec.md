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

