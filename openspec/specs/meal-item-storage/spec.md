# meal-item-storage Specification

## Purpose
TBD - created by archiving change add-meal-item-analysis. Update Purpose after archive.
## Requirements
### Requirement: 음식별 저장
시스템은 확인·수정된 음식 항목 배열과 끼니·섭취 시각·출처를 받아 meal(합계)과 meal_item(음식별)로 저장해야 한다(SHALL). meal의 총 영양값은 항목 합으로 재계산해 저장해야 한다(MUST). 위치 박스는 저장하지 않아야 한다(MUST NOT). 항목 하나(직접 입력)도 동일 경로로 저장할 수 있어야 한다(MUST).

#### Scenario: 여러 항목 저장
- **WHEN** 사용자가 음식 항목들을 확정해 저장하면
- **THEN** meal 한 건과 각 항목의 meal_item이 저장되고, meal 합계는 항목 합과 일치한다

#### Scenario: 각 항목 검증
- **WHEN** 어떤 항목의 영양값이 음수이거나 허용 범위를 벗어나면
- **THEN** 400과 오류를 반환하고 아무것도 저장하지 않는다

### Requirement: 음식별 조회·수정·삭제
시스템은 회원이 저장된 식사를 음식별 항목과 함께 조회하고, 항목을 수정(전체 교체)하거나 식사를 삭제할 수 있게 해야 한다(SHALL). 수정 시 meal 합계를 재계산해야 하며(MUST), 다른 회원의 기록에는 접근할 수 없어야 한다(MUST).

#### Scenario: 항목 포함 조회
- **WHEN** 회원이 날짜별 식사를 조회하면
- **THEN** 각 식사에 음식별 항목 목록이 포함되어 반환된다

#### Scenario: 항목 수정 시 합계 재계산
- **WHEN** 회원이 한 식사의 항목들을 수정해 저장하면
- **THEN** 기존 항목이 교체되고 meal 합계가 새 항목 합으로 재계산된다

#### Scenario: 타인 기록 접근 차단
- **WHEN** 회원이 다른 회원의 식사를 조회·수정·삭제하려 하면
- **THEN** 접근이 거부된다(404)

