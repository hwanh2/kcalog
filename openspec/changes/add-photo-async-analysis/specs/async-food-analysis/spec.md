# async-food-analysis (delta)

## ADDED Requirements

### Requirement: 비동기 분석 작업 생성
시스템은 이미지와 끼니 구분을 받아 분석 작업을 만들고 **즉시 작업 식별자를 반환**해야 한다(SHALL). 사진은 스토리지에 저장하고(MUST), 실제 AI 분석은 백그라운드에서 수행해야 한다(MUST). 작업 생성 시점에 어떤 식사 기록(meal)도 만들지 않아야 한다(MUST NOT — meal은 확인 저장 시에만 생성).

#### Scenario: 작업 생성
- **WHEN** 로그인한 회원이 음식 사진으로 `POST /api/analyses`를 호출하면
- **THEN** 사진이 저장되고 ANALYZING 상태의 작업이 만들어지며 작업 id가 즉시 반환된다(분석 완료를 기다리지 않는다)

#### Scenario: 백그라운드 분석
- **WHEN** 작업이 생성되면
- **THEN** 백그라운드에서 AI 분석이 수행되고, 완료 시 결과(음식별 항목·신뢰도)가 작업에 기록된다

### Requirement: 분석 상태·결과 폴링
시스템은 작업의 현재 상태와 완료 결과를 조회하는 엔드포인트를 제공해야 한다(SHALL). 상태는 ANALYZING / COMPLETED / FAILED / NO_FOOD 중 하나여야 하며(MUST), 완료 시 음식별 항목·전체 신뢰도·비고와 사진 참조를 포함해야 한다(MUST). 다른 회원의 작업에는 접근할 수 없어야 한다(MUST).

#### Scenario: 진행 중 조회
- **WHEN** 회원이 `GET /api/analyses/{id}`를 분석 완료 전에 호출하면
- **THEN** ANALYZING 상태를 반환한다

#### Scenario: 완료 결과 조회
- **WHEN** 분석이 완료된 뒤 조회하면
- **THEN** COMPLETED 상태와 음식별 항목·신뢰도·사진 참조를 반환한다

#### Scenario: 음식 미검출
- **WHEN** 음식이 식별되지 않으면
- **THEN** NO_FOOD 상태와 안내를 반환하고 오류로 처리하지 않는다

#### Scenario: 분석 실패
- **WHEN** AI 호출이 타임아웃·파싱 실패로 재시도 후에도 실패하면
- **THEN** FAILED 상태를 반환해 프론트가 재시도·수동 입력으로 폴백할 수 있게 한다

#### Scenario: 타인 작업 접근 차단
- **WHEN** 회원이 다른 회원의 작업을 조회하면
- **THEN** 접근이 거부된다(404)

### Requirement: 재시작 복구
시스템은 애플리케이션 재시작으로 중단된 작업을 정합성 있게 정리해야 한다(SHALL). 기동 시 ANALYZING 상태로 남은 작업은 FAILED로 표시해야 한다(MUST) — 사용자가 재요청하도록.

#### Scenario: 중단된 작업 복구
- **WHEN** 분석 도중 앱이 재시작되어 작업이 ANALYZING로 남으면
- **THEN** 기동 시 그 작업이 FAILED(중단)로 정리되어 무한 대기하지 않는다

### Requirement: 일일 분석 횟수 제한
시스템은 회원당 하루 분석 작업 생성 횟수를 설정된 상한으로 제한해야 한다(SHALL). 상한을 초과하면 작업을 만들지 않고 429와 안내를 반환해야 한다(MUST). 동시 요청에서도 상한을 정확히 지켜야 한다(MUST).

#### Scenario: 상한 초과
- **WHEN** 회원이 당일 상한을 초과해 `POST /api/analyses`를 호출하면
- **THEN** 429와 "오늘 분석 가능 횟수를 초과했어요" 안내를 반환하고 AI를 호출하지 않으며 작업을 만들지 않는다

### Requirement: 미확인 작업 정리
시스템은 확인 저장되지 않은 분석 작업을 보존 기간 후 정리해야 한다(SHALL). 정리 시 작업과 연결된 사진을 함께 삭제해야 한다(MUST).

#### Scenario: 미확인 작업 만료
- **WHEN** 확인 저장되지 않은 작업이 보존 기간을 넘기면
- **THEN** 주기적 정리가 그 작업과 사진을 삭제한다
