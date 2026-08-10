# meal-analysis-eval Specification

## Purpose
TBD - created by archiving change add-meal-weight-tracking. Update Purpose after archive.
## Requirements
### Requirement: 음식 평가 세트
시스템은 `eval/` 디렉터리에 음식 사진과 각 사진의 기대 영양값(총 kcal·탄·단·지)을 짝지은 평가 세트를 보유해야 한다(SHALL). 세트는 한식·양식·중식·일식, 가정식·외식·배달 등 다양한 음식을 대표해야 한다(SHOULD).

#### Scenario: 평가 세트 구성
- **WHEN** 평가를 실행하려 할 때
- **THEN** 각 사진에 대응하는 기대값(JSON)이 존재해 채점 기준이 된다

### Requirement: 분석 정확도 채점
시스템은 평가 세트의 각 사진을 분석 모델에 통과시켜 추정값과 기대값의 오차를 집계하는 채점 도구를 제공해야 한다(SHALL). 채점 결과는 모델·프롬프트 간 비교가 가능하도록 오차 지표(예: MAPE)를 산출해야 한다(MUST). 이 도구는 실제 API 호출·키가 필요하므로 CI에 포함하지 않고 수동 실행해야 한다(MUST).

#### Scenario: 모델 비교
- **WHEN** 동일 평가 세트를 서로 다른 모델(예: mini vs nano)로 채점하면
- **THEN** 모델별 오차 지표를 산출해 승격/강등 판단 근거를 제공한다

#### Scenario: 프롬프트 변경 검증
- **WHEN** 분석 프롬프트를 변경한 뒤 채점을 재실행하면
- **THEN** 변경 전후 오차 지표를 비교할 수 있다

