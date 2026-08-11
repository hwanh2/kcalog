# add-weekly-report

## Why

리포트 탭(현재 준비 중)을 채운다. 한 주를 돌아보며 "목표를 얼마나 지켰나·무엇을 고칠까"를 한눈에 보여준다. 새 데이터 없이 기존 식사·체중 추세·TDEE를 주간으로 엮고, **규칙 기반 신호 + 랭킹**으로 인사이트를 낸다. 자연어 서술(LLM)은 다음 change(`add-ai-coaching`)가 같은 신호를 소비한다.

## What Changes

- **기간 리포트 조회** — 주간(요일별)·월간(일별)·총(월별) 기간을 버킷으로 엮어 목표 달성 요약·탄단지 분포·TDEE 변화·인사이트를 계산해 반환. 기간 토글(주간/월간/총).
- **목표 달성 요약** — 목표 달성일 수(감량 목표면 `섭취 ≤ 목표`, 그 외 밴드 ±10%), 평균 섭취 vs 목표, 기록 성실도.
- **탄단지 분포(일별 스택 막대)** — 버킷별 일 평균 탄단지를 스택 막대로, 탭 시 툴팁으로 그 버킷의 탄·단·지. 기간 평균 g·칼로리 비율(%)·목표 대비도 함께.
- **TDEE 변화** — 버킷별 TDEE 시리즈(조회 시 재계산, 데이터 부족일은 공식 폴백).
- **인사이트(규칙 기반)** — 신호 계산 → 심각도 랭킹 → 상위 3개를 템플릿 문구로. 신호는 구조화 데이터라 LLM 코칭이 재사용.
- **UI** — 리포트 탭 구현(기간 토글, 스택 막대+툴팁, TDEE 스파크라인, 달성·인사이트).

## Impact

- Affected specs: `weekly-report` (신규 capability)
- Affected code (backend): `WeeklyReportService`(주간 집계·달성·분포·신호·랭킹, 순수 계산 TDD), `WeeklyReportResponse` DTO, `ReportController` `GET /api/reports/weekly?weekStart=`; `TdeeService.get`에 asOf 파라미터 추가(일별 시리즈), meal 일별 집계·`MacroTargetG`·`WeightTrend` 재사용
- Affected code (frontend): `api/report.ts`, 리포트 탭 페이지(달성·분포·TDEE·인사이트 섹션 + 주 이동), 라우팅에서 ComingSoon 대체
- 마이그레이션: 없음 (조회 시 계산)
- 스코프 밖: LLM 서술 인사이트(`add-ai-coaching`), 월간/커스텀 기간, 리포트 공유·내보내기, 매크로 목표 재분배
