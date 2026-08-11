# Tasks: add-weekly-report

## 1. 순수 계산 (TDD)
- [x] 1.1 주간 달성 판정 — 감량(≤목표)/그외(±10% 밴드) 달성일 집계 + 테스트
- [x] 1.2 탄단지 분포 — 평균 g·칼로리 비율(4/4/9) + 테스트
- [x] 1.3 신호 계산 7개(달성일·목표초과일·단백질미달일·지방연속초과·탄수연속초과·성실도·감량중잉여) + 테스트 (체중추세 신호는 제외 — design 이탈)
- [x] 1.4 신호 랭킹 → 상위 N 템플릿 문구 + 테스트(부정 우선·긍정 폴백)

## 2. TDEE 시리즈
- [x] 2.1 `TdeeService.get(memberId, asOf)` — asOf 파라미터 확장(현재 today 고정) + 기존 테스트 유지
- [x] 2.2 주간 7일 일별 TDEE 시리즈 조립(출처 포함, 데이터 부족일 처리)

## 3. 서비스·API
- [x] 3.1 `WeeklyReportResponse` DTO(주간 구간·달성·분포·TDEE 시리즈·인사이트)
- [x] 3.2 `ReportService.get(memberId, period, anchor)` — 공용 일별 집계(`MealDailyIntake`) → 달성·분포·신호·TDEE 조립
- [x] 3.3 `ReportController` `GET /api/reports?period=&anchor=`
- [x] 3.4 통합 테스트 — 달성·분포·TDEE·인사이트, 목표 없음/데이터 부족

## 4. 프론트엔드
- [x] 4.1 `api/report.ts` — 타입 + `getWeeklyReport(weekStart?)`
- [x] 4.2 리포트 페이지 — 기간 토글(주간/월간/총), 달성 요약·탄단지 분포(스택 막대)·TDEE 스파크라인·인사이트 목록
- [x] 4.3 라우팅 `/report` ComingSoon → 리포트 페이지 교체 (AppShell 테스트 갱신)
- [x] 4.4 프론트 테스트(섹션 렌더·기간 토글·툴팁·데이터 부족)

## 5. 마무리
- [x] 5.1 `./gradlew test` · `npm run build` · `npm test` · `openspec validate --strict` 통과
- [x] 5.2 design.md Open Questions 반영

## 6. 확장 (사용자 요청)
- [x] 6.1 기간 토글(주간/월간/총) — `?period=`, 버킷(요일/일/월별) 응답
- [x] 6.2 탄단지 일별 스택 막대 + 탭 툴팁(`MacroBars`)
