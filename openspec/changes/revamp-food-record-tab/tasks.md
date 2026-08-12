# Tasks: revamp-food-record-tab

> PR 분할: **1~6 = PR1(서버)**, **7~11 = PR2(프론트)**. PR1 머지 후 PR2 착수.

## 1. 서비스 하루 경계 (TDD)
- [x] 1.1 `ServiceDay` 유틸 — `of(date, zone)`(05:00~다음날 05:00) · `today(clock)` + 경계 테스트(04:59/05:00/23:59)
- [x] 1.2 `DayRange`를 `ServiceDay` 기반으로 (식사 날짜별 조회)
- [x] 1.3 `MealDailyIntake.byDate`·`earliestDate` 경계 이관 (리포트·TDEE 공용)
- [x] 1.4 대시보드·코칭 시그널의 "오늘" 판정을 `ServiceDay.today`로 이관 (코칭 **채팅 상한**은 비용 카운터라 달력 날짜 유지)
- [x] 1.5 통합 테스트 — 새벽 기록이 전날로 조회·집계되는지(식사 `dayBoundary`·대시보드 `lateNightCountsToPreviousDay`)
- [x] 1.6 체중·`analysis_usage`는 달력 날짜 유지 — 기존 테스트 회귀 없음으로 확인

## 2. 끼니·수량 (도메인)
- [x] 2.1 `MealType`에 `LATE_NIGHT` 추가 (마이그레이션 없음 — VARCHAR·CHECK 없음)
- [x] 2.2 Flyway **V13** — `meal_item.quantity NUMERIC(6,2)` · `unit VARCHAR(20)` (nullable)
- [x] 2.3 `MealItem`에 수량·단위 필드 + 정적 팩토리 확장, `MealItemRequest`/`MealItemResponse` 반영
- [x] 2.4 수량 검증 — 0 초과, 상한, 단위 길이 (`MealValidation`)
- [x] 2.5 통합 테스트 — 수량과 함께 저장·조회, 수량 없는 항목 허용, 야식 저장·조회, 같은 끼니 여러 건

## 3. 음식 카탈로그
- [x] 3.1 Flyway **V14** — `food_catalog` 생성 (`name`·`emoji`·`aliases`·`base_quantity`·`unit`·영양 4·`sort_order`)
- [x] 3.2 시드 30행 — 이미지 기준 20개 + 한식·외식 메뉴로 확장, 별칭 포함 **(값 검수 필요)**
- [x] 3.3 `FoodCatalog` 엔티티·리포지토리·`FoodResponse`
- [x] 3.4 `GET /api/foods` — 카탈로그 + 회원 즐겨찾기 통합 목록(출처 구분) 반환
- [x] 3.5 통합 테스트 — 목록 반환·정렬·인증 필요

## 4. 즐겨찾기
- [x] 4.1 Flyway **V15** — `member_favorite_food` (`member_id`+`name_normalized` 유니크)
- [x] 4.2 `MemberFavoriteFood` 엔티티 — `FoodNames.normalize` 재사용, 갱신 도메인 메서드
- [x] 4.3 `POST /api/favorites` — 저장·덮어쓰기, `rememberForAnalysis` 옵션 시 개인 보정치 동시 저장(1단위 환산, 같은 트랜잭션)
- [x] 4.4 `GET /api/favorites` · `DELETE /api/favorites/{id}` — 소유권 검증(404)
- [x] 4.5 통합 테스트 — 저장·중복 갱신(띄어쓰기 흡수)·타인 접근 차단·보정치 연동 on/off·수량 환산

## 5. 분석 입력 확장 (사진·설명)
- [x] 5.1 Flyway **V16** — `analysis_job.image_key` NOT NULL 해제, `note VARCHAR(500)`·`reanalysis_count INT NOT NULL DEFAULT 0`
- [x] 5.2 `AnalysisJob` — 사진 없는 생성 팩토리·설명 보관·재분석 상태 전이(`reanalyze()`)·횟수 상한 판정
- [x] 5.3 `AnalysisController` — `image`·`note` 모두 선택, 최소 하나 검증(400)
- [x] 5.4 `AnalysisService.createJob` — 사진 없으면 스토리지 저장·보상 삭제 생략
- [x] 5.5 `MealAnalysisPrompt` — 텍스트 전용 분기(이미지 파트·`box` 스키마 제외), 설명 주입, **항목에 `amount`·`unit` 추가**
- [x] 5.6 `MealAnalysisService.analyzeText` + `AnalyzedItem`에 섭취량
- [x] 5.7 `AnalysisWorker`가 사진 유무로 분기
- [x] 5.8 `AnalysisCleanup` 사진 없는 작업 처리(스토리지 접근 생략) — `AnalysisStartupRecovery`는 사진을 만지지 않아 변경 없음
- [x] 5.9 통합 테스트 — 사진만·사진+설명·설명만·둘 다 없음(400)·공백 설명(400)·사진 없는 작업 정리

## 6. 재분석
- [x] 6.1 `POST /api/analyses/{id}/reanalyze` — 설명 필수, 소유권 검증, 일일 횟수 차감, 작업당 2회 상한
- [x] 6.2 기존 작업 갱신(ANALYZING 복귀·결과 덮어쓰기), 사진 재사용
- [x] 6.3 통합 테스트 — 결과 대체·2회 상한 초과 거부·횟수 차감(429)·타인 작업 404·설명 전용 작업 재분석
- [x] 6.4 `eval/` 기대값 — **대상 없음**(디렉터리에 `.gitkeep`만 있어 평가 세트 미작성)

## 6-1. PR #33 리뷰 대응
- [x] 6-1.1 개인 보정치에 기준 섭취량 도입 — Flyway **V17**(`base_quantity`·`unit`), 저장은 총량 그대로(두 경로 통일)
- [x] 6-1.2 `PersonalCorrection.scaledTo` (TDD) — 같은 단위면 비례 조정, 불가하면 저장값 유지
- [x] 6-1.3 `applyOverride`가 분석 항목의 섭취량에 맞춰 조정, 프롬프트 주입에 기준 섭취량 표기
- [x] 6-1.4 `reanalyze`에 상태 가드 — ANALYZING이면 400 (워커 중복·횟수 이중 차감 방지)
- [x] 6-1.5 `ServiceDay` 경계 계산을 `Duration` 하나로 통일 (비정시 경계에서 어긋나지 않게)
- [x] 6-1.6 통합 테스트 — 비례 조정·단위 불일치 폴백·총량 저장·분석 중 재분석 400

## 7. 음식기록 탭 뼈대 (프론트)
- [ ] 7.1 `mealDefaults` — 끼니 5개 라벨, `defaultMealType` 규칙 변경(00~05·21~24 야식, 간식 자동선택 제외) + 테스트
- [ ] 7.2 `RecordsPage` 재작성 — 날짜 + 끼니 세그먼트(배지 = 그 끼니 기록 수) + 선택 끼니 기록 목록 + 끼니 합계
- [ ] 7.3 기록 카드 — 사진 썸네일·시각·항목 요약·수량 표시(있을 때만)·수정/삭제
- [ ] 7.4 라우팅 정리 — `/meals/new` 제거, `AppShell` FAB이 음식기록 탭 이동 + 카메라 즉시 열기
- [ ] 7.5 프론트 테스트 — 세그먼트 전환·합계 계산·빈 상태·FAB 동작

## 8. 자주먹는 탭 (프론트)
- [ ] 8.1 `api/food.ts` — 카탈로그·즐겨찾기 통합 조회 훅(캐시)
- [ ] 8.2 검색 매칭 (TDD) — 정규화 → 별칭 → 부분일치 → 음절 bigram 자카드(임계 0.3), 정렬 규칙
- [ ] 8.3 2열 그리드 카드 — 이모지/첫 글자 배지·이름·kcal·기본량·`[+]`·`[★]`
- [ ] 8.4 수량 바텀시트 — 증감·영양 재계산 표시·"{끼니}에 기록하기"
- [ ] 8.5 검색 결과 없음 → "'{검색어}' 직접 추가하기"
- [ ] 8.6 프론트 테스트 — 검색 매칭 4종·수량 변경 시 재계산·담기 후 목록 갱신

## 9. 즐겨찾기 탭 (프론트)
- [ ] 9.1 목록·삭제·`[+]` 담기(수량 시트 공용)
- [ ] 9.2 저장 시트 — 이름·수량·단위·영양 + "AI 분석에도 반영" 체크박스
- [ ] 9.3 "직접 만들기" 진입점
- [ ] 9.4 프론트 테스트 — 저장·중복 갱신·삭제·체크박스 전달

## 10. AI로 기록 탭 (프론트)
- [ ] 10.1 입력 화면 — 사진 선택(선택)·설명 입력(선택)·둘 다 없으면 제출 불가
- [ ] 10.2 분석 진행 표시 — 사진 미리보기 포함, 폴링 첫 시도 즉시
- [ ] 10.3 결과 풀스크린 시트 — `PhotoOverlay`·`AnalysisSummary`·`AnalyzedItemList`·`ItemEditSheet` 재사용, 사진 없으면 목록형
- [ ] 10.4 항목별 수량 표시·수정(비례 재계산), 항목 ★로 즐겨찾기 저장
- [ ] 10.5 재분석 — 설명 입력·수정값 있으면 덮어쓰기 경고·2회 상한 안내·실패 시 직전 결과 복원
- [ ] 10.6 "AI 없이 직접 입력하기" 링크 → 수동 입력 시트(8.5와 공용)
- [ ] 10.7 실패·429·NO_FOOD 폴백 유지
- [ ] 10.8 프론트 테스트 — 3가지 입력 조합·재분석 경고·상한 안내·복원

## 11. 마무리
- [ ] 11.1 `./gradlew test` · `npm run build` · `npm test` · `openspec validate --strict` 통과
- [ ] 11.2 design.md에 구현 이탈 반영
