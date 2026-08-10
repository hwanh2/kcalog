# meal-logging Specification

## Purpose
TBD - created by archiving change add-meal-weight-tracking. Update Purpose after archive.
## Requirements
### Requirement: 식사 기록 저장
시스템은 확인·수정된 영양값(총 kcal, 탄·단·지)과 끼니 구분·섭취 시각·출처(AI/MANUAL)를 받아 식사 기록을 저장해야 한다(SHALL). 사진 없이 숫자만으로도 저장할 수 있어야 한다(MUST). AI 분석 결과를 저장할 때는 그 분석 작업의 저장된 사진을 식사 기록에 연결해야 한다(MUST). 영양값은 음수가 아니어야 하며 허용 범위를 검증해야 한다(MUST).

#### Scenario: AI 결과 확인 후 저장
- **WHEN** 회원이 분석 작업의 결과를 확인·수정해 `POST /api/meals`로 제출하면(분석 작업 참조 포함)
- **THEN** 식사 기록이 source=AI로 저장되고, 그 작업의 사진이 식사 기록에 연결되어 목록에서 썸네일로 볼 수 있다

#### Scenario: 수동 입력 저장
- **WHEN** 회원이 사진 없이 영양값을 직접 입력해 제출하면
- **THEN** source=MANUAL로 사진 연결 없이 저장된다

#### Scenario: 범위 밖 입력
- **WHEN** 영양값이 음수이거나 허용 범위를 벗어나면
- **THEN** 400과 항목별 오류를 반환하고 저장하지 않는다

### Requirement: 식사 기록 조회·수정·삭제
시스템은 회원이 자신의 식사 기록을 날짜별로 조회하고, 개별 기록을 수정·삭제할 수 있게 해야 한다(SHALL). 다른 회원의 기록에는 접근할 수 없어야 한다(MUST). 조회 응답은 사진이 연결된 기록에 대해 사진 참조를 포함해야 하며(MUST), 기록 삭제 시 연결된 사진도 삭제해야 한다(MUST).

#### Scenario: 날짜별 조회
- **WHEN** 회원이 `GET /api/meals?date=YYYY-MM-DD`를 호출하면
- **THEN** 해당 날짜 자신의 식사 기록을 섭취 시각 순으로, 사진이 있으면 사진 참조와 함께 반환한다

#### Scenario: 기록 수정
- **WHEN** 회원이 자신의 기록에 대해 영양값·끼니 구분을 수정하면
- **THEN** 변경된 기록이 저장되고 반환된다

#### Scenario: 타인 기록 접근 차단
- **WHEN** 회원이 다른 회원의 기록을 조회·수정·삭제하려 하면
- **THEN** 접근이 거부된다(404)

#### Scenario: 기록 삭제
- **WHEN** 회원이 사진이 연결된 자신의 기록을 삭제하면
- **THEN** 기록이 제거되고 스토리지의 연결된 사진도 삭제된다

