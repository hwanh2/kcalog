# onboarding

## ADDED Requirements

### Requirement: 온보딩 완료 판정과 강제 진입
시스템은 회원의 `daily_kcal_target`이 null이면 온보딩 미완료로 판정해야 한다(SHALL). `GET /api/members/me` 응답은 `onboardingCompleted` 필드를 포함해야 하며(MUST), 프론트엔드는 미완료 회원을 온보딩 화면으로 이동시켜야 한다(SHALL).

#### Scenario: 미완료 회원의 첫 진입
- **WHEN** 온보딩을 마치지 않은 회원이 로그인 후 앱에 진입하면
- **THEN** 온보딩 화면으로 이동되며 다른 화면(홈 등)으로는 접근할 수 없다

#### Scenario: 완료 회원의 진입
- **WHEN** 온보딩을 마친 회원이 로그인하면
- **THEN** 홈(오늘) 화면으로 이동한다

### Requirement: 프로필·목표 입력
시스템은 온보딩에서 성별, 출생연도, 키(cm), 현재 체중(kg), 목표 체중(kg), 활동량(LOW/MID/HIGH)을 입력받아 검증 후 저장해야 한다(SHALL). 저장 시 현재 체중은 오늘 날짜의 `weight_log`로 기록해야 한다(MUST).

#### Scenario: 정상 제출
- **WHEN** 회원이 모든 항목을 유효하게 입력하고 제출하면
- **THEN** member 프로필 필드가 저장되고, 오늘 날짜 weight_log가 생성되며, 확정된 일일 칼로리 목표가 저장되어 온보딩이 완료된다

#### Scenario: 유효 범위 밖 입력
- **WHEN** 키/체중/출생연도가 허용 범위(예: 키 100~230cm, 체중 30~250kg, 출생연도 1920~현재)를 벗어나면
- **THEN** 400과 항목별 오류 메시지를 반환하고 아무것도 저장하지 않는다

### Requirement: 일일 칼로리 목표 자동 계산
시스템은 Mifflin-St Jeor BMR × 활동계수(LOW 1.2 / MID 1.5 / HIGH 1.75)에 목표 조정(감량 −500, 증량 +300, 유지 0)을 적용해 일일 칼로리 목표를 계산해야 한다(SHALL). 결과는 10kcal 단위로 반올림하고, 남 1500 / 여 1200 kcal 미만으로 내려가지 않아야 한다(MUST). 계산값은 제안값이며 사용자가 수정한 값을 최종 저장해야 한다(SHALL).

#### Scenario: 감량 목표 계산
- **WHEN** 현재 체중보다 낮은 목표 체중을 입력하면
- **THEN** TDEE − 500을 10 단위 반올림한 값이 제안된다

#### Scenario: 하한선 클램프
- **WHEN** 계산 결과가 성별 하한선(남 1500 / 여 1200) 미만이면
- **THEN** 하한선 값으로 제안된다

#### Scenario: 사용자 수정
- **WHEN** 회원이 제안된 목표를 다른 값으로 수정해 제출하면
- **THEN** 수정한 값이 `daily_kcal_target`으로 저장된다
