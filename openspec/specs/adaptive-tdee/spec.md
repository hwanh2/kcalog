# adaptive-tdee Specification

## Purpose
TBD - created by archiving change add-adaptive-tdee. Update Purpose after archive.
## Requirements
### Requirement: 실측 유지칼로리 역산
시스템은 최근 트레일링 창의 실제 섭취량과 체중 추세로 유지칼로리(TDEE)를 역산해야 한다(SHALL). 계산은 에너지수지식(`평균 일일섭취 − 일일 추세체중변화 × 체지방 에너지상수`)을 사용해야 하며(MUST), 체중 변화는 원시값이 아니라 추세(EMA)를 써야 한다(MUST). 값은 조회 시 계산하며 별도 영속화하지 않아야 한다(MUST — 입력이 저장돼 있어 재계산 가능).

#### Scenario: 감량 중 실측
- **WHEN** 창 내 섭취가 충분히 기록되고 추세 체중이 감소했다면
- **THEN** 소비가 섭취보다 큰 값으로 실측 유지칼로리가 계산되어 status=OK, source=ADAPTIVE로 반환된다

#### Scenario: 조회 시 재계산
- **WHEN** 회원이 `GET /api/tdee`를 호출하면
- **THEN** 저장된 체중 로그·식사로부터 그 시점 기준으로 유지칼로리가 재계산되어 반환된다

### Requirement: 불완전 로깅 폴백
시스템은 실측을 신뢰할 수 없을 때 공식 TDEE로 폴백해야 한다(SHALL). 창 내 섭취 로깅 커버리지가 임계 미만이거나 추세를 낼 체중 기록이 부족하면 실측을 내지 않고(MUST NOT) 공식 TDEE(Mifflin-St Jeor × 활동계수)를 반환하며 데이터 부족 상태를 알려야 한다(MUST).

#### Scenario: 섭취 로깅 성김
- **WHEN** 창 내 섭취 기록 커버리지가 임계 미만이면
- **THEN** status=INSUFFICIENT_DATA, source=FORMULA로 공식 TDEE를 반환하고 실측값을 내지 않는다

#### Scenario: 체중 기록 부족
- **WHEN** 추세 양끝을 낼 체중 기록이 부족하면
- **THEN** status=INSUFFICIENT_DATA로 공식 TDEE를 반환한다

### Requirement: 데이터 기반 목표 추천 (자동 아님)
시스템은 유지칼로리와 목표 방향(감량/유지/증량)으로 추천 일일 목표를 산출해 제공해야 한다(SHALL). 목표 조정·하한·반올림은 온보딩 계산과 동일 정책을 사용해야 한다(MUST). 추천을 자동으로 적용해 회원의 목표를 바꾸지 않아야 하며(MUST NOT), 사용자가 명시적으로 적용할 때만 목표가 갱신되어야 한다(MUST).

#### Scenario: 추천 목표 표시
- **WHEN** 회원이 `GET /api/tdee`를 호출하면
- **THEN** 현재 목표와 추천 목표를 함께 반환하고, 회원의 목표는 변경되지 않는다

#### Scenario: 사용자 적용
- **WHEN** 사용자가 추천 목표를 적용하면
- **THEN** 회원의 일일 목표가 그 값으로 갱신된다

#### Scenario: 타인 접근 차단
- **WHEN** 인증되지 않은 요청이 유지칼로리를 조회하면
- **THEN** 접근이 거부된다

