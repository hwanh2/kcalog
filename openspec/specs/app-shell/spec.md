# app-shell Specification

## Purpose
TBD - created by archiving change add-meal-weight-tracking. Update Purpose after archive.
## Requirements
### Requirement: 3탭 네비게이션 레이아웃
시스템은 인증된 회원에게 하단 3탭(오늘/기록/프로필) 네비게이션을 제공해야 한다(SHALL). 탭 전환은 서버 왕복 없이 이루어져야 하며(MUST), 현재 탭이 시각적으로 구분되어야 한다(MUST). 온보딩 미완료 회원에게는 탭 셸을 노출하지 않아야 한다(MUST, 온보딩 화면 강제 — 기존 가드 규칙 유지).

#### Scenario: 탭 이동
- **WHEN** 온보딩을 마친 회원이 하단 탭을 누르면
- **THEN** 해당 화면(오늘/기록/프로필)으로 서버 요청 없이 전환되고 현재 탭이 강조된다

#### Scenario: 오늘 탭의 기록 진입점
- **WHEN** 회원이 오늘 탭에 있으면
- **THEN** 식사 기록(사진 촬영/선택)을 시작하는 진입점이 제공된다

#### Scenario: 온보딩 미완료 회원
- **WHEN** 온보딩을 마치지 않은 회원이 진입하면
- **THEN** 탭 셸 대신 온보딩 화면으로 강제 이동된다

### Requirement: 스타일 시스템
시스템은 일관된 디자인 토큰(색·간격·타이포)을 적용한 스타일 시스템을 갖춰야 한다(SHALL). 기존 온보딩·프로필·홈 화면도 이 스타일 시스템에 편입되어야 한다(MUST).

#### Scenario: 일관된 스타일 적용
- **WHEN** 회원이 어느 화면을 보든
- **THEN** 공통 디자인 토큰(색·간격·타이포)이 일관되게 적용되어 있다

#### Scenario: 모바일 우선 레이아웃
- **WHEN** 회원이 모바일 화면 폭에서 앱을 사용하면
- **THEN** 3탭 셸과 콘텐츠가 모바일에 맞게 배치된다

