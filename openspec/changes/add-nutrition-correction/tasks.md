# Tasks: add-nutrition-correction

## 1. 데이터 모델·마이그레이션
- [ ] 1.1 `V10__food_correction.sql` — 테이블 + `UNIQUE (member_id, food_name_normalized)` + `member_id` 인덱스
- [ ] 1.2 `FoodCorrection` 엔티티 — BaseEntity 상속, 정적 팩토리 `of(...)`, `updateNutrition(...)` 도메인 메서드(@Setter 금지)
- [ ] 1.3 음식명 정규화 유틸(`FoodNames.normalize`) + 단위 테스트(TDD: 공백·연속공백·영문 소문자)
- [ ] 1.4 `FoodCorrectionRepository` — `findByMemberIdOrderByUpdatedAtDesc`(상한), `findByMemberIdAndFoodNameNormalized`

## 2. 보정 서비스 (도메인 로직 TDD)
- [ ] 2.1 `FoodCorrectionService.upsert(memberId, name, kcal, carb, protein, fat)` — 정규화 매칭 후 없으면 생성/있으면 덮어쓰기
- [ ] 2.2 `FoodCorrectionService.recentFor(memberId, limit)` — 최근 갱신 N개
- [ ] 2.3 `FoodCorrectionService.applyOverride(result, corrections)` — 정규화 일치 항목 보정값 대체 + `corrected=true` (TDD: 매칭/미매칭/빈 이력)
- [ ] 2.4 upsert 덮어쓰기·최신값 검증 단위 테스트

## 3. 분석 통합 (A 덮어쓰기 + B 주입)
- [ ] 3.1 `MealAnalysisResponse.AnalyzedItem`에 `boolean corrected` 추가(스키마 밖 후처리 필드, 기본 false)
- [ ] 3.2 `MealAnalysisService.analyzeImage(bytes, contentType, corrections)` 시그니처 확장 — 레거시 `analyze()`는 빈 리스트 전달
- [ ] 3.3 `MealAnalysisPrompt` — 이력 비면 기존과 동일(바이트 동일), 있으면 "개인 보정 이력" 섹션 주입
- [ ] 3.4 `AnalysisWorker.process` — `recentFor` 로드 → 주입 분석 → `applyOverride` → 저장
- [ ] 3.5 `AppProperties`에 `correction-inject-limit`(50)·`low-confidence-threshold`(0.7) 추가 + yml 기본값

## 4. 저장 경로 (쓰기)
- [ ] 4.1 `MealItemRequest`에 `boolean remember`(기본 false) 추가
- [ ] 4.2 `MealService.save` — `remember=true` 항목마다 `foodCorrectionService.upsert`(같은 트랜잭션)
- [ ] 4.3 저장 실패 시 보정 롤백 통합 테스트(기존 `MealSaveConsistencyTest` 패턴)

## 5. 통합 테스트
- [ ] 5.1 정정+기억 저장 → 보정치 생성/덮어쓰기 검증
- [ ] 5.2 보정치 있는 회원 분석 → 해당 항목 `corrected=true`·보정값 대체(덮어쓰기 A) 검증
- [ ] 5.3 이력 없음 → 기존과 동일 동작 검증

## 6. 프론트엔드
- [ ] 6.1 `api/meal.ts` — SaveMealRequest item에 `remember?: boolean`
- [ ] 6.2 `api/analysis.ts` — Analysis item에 `corrected: boolean`
- [ ] 6.3 확인 바텀시트 — 항목별 "이 값 기억하기" 토글
- [ ] 6.4 배지 — `corrected` 항목 "내 값 적용됨", `overallConfidence < 임계값` 시 "확인 필요"
- [ ] 6.5 프론트 테스트(토글 저장 시 remember 전달, 배지 렌더)

## 7. 마무리
- [ ] 7.1 `./gradlew test` · `npm run build` · `npm test` · `openspec validate --strict` 통과
- [ ] 7.2 design.md의 Open Questions 구현 결과 반영
