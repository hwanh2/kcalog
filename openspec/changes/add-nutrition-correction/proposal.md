# add-nutrition-correction

## Why

차별점 #1 "학습하는 수정(기억하는 AI)". 경쟁 서비스(Cal AI)의 최대 약점은 *사용자가 고친 값이 세션 간 저장·학습되지 않는 것*이다. 사용자가 사진 분석 결과를 정정하고 "이 값 기억하기"를 누르면 그 값을 개인 보정치로 저장해, 다음 분석부터 자동 반영한다. 우리는 외부 영양성분 DB가 없고 Vision AI가 값을 직접 주므로, 보정은 "AI 출력값에 대한 개인 보정"이다.

## What Changes

- **개인 보정치 저장(`food_correction`)** — 확인 화면에서 정정 + "기억하기"로 저장 시, 항목의 확정 영양값을 회원별로 upsert. 매칭 키는 정규화된 음식명. 재정정은 최신값으로 덮어쓰기.
- **분석에 보정 자동 반영(A+B 계층)**:
  - **A. 코드 결정적 덮어쓰기** — 분석 응답 항목 중 정규화 이름이 보정치와 일치하면 저장된 값으로 정확히 대체하고 "보정됨" 표시. *명시적으로 고친 값의 정확 재현 보장*.
  - **B. 프롬프트 주입** — 회원의 보정 이력을 Vision 프롬프트에 실어 AI가 유사 음식·다른 양까지 개인화. 토큰·지연 방어로 최근 N개 상한.
- **저신뢰 확인 유도** — 전반 신뢰도가 임계값 미만이면 "확인 필요" 표시로 정정을 유도(정정이 곧 학습 데이터).
- **프론트** — 확인 바텀시트에 항목별 "이 값 기억하기" 토글, "내 값 적용됨"·"확인 필요" 배지.

## Impact

- Affected specs: `nutrition-correction` (신규 capability)
- Affected code (backend): `FoodCorrection` 엔티티·리포지토리·서비스(신규), `V10__food_correction.sql`, `MealAnalysisService.analyzeImage`(개인 이력 파라미터), `MealAnalysisPrompt`(이력 섹션), `AnalysisWorker`(이력 로드·주입·덮어쓰기), `MealAnalysisResponse.AnalyzedItem`(`corrected` 플래그), `SaveMealRequest`/`MealItemRequest`(`remember`), `MealService.save`(upsert 연동), `AppProperties`(주입 상한·신뢰도 임계값)
- Affected code (frontend): 확인 화면 토글·배지, `api/meal.ts`(`remember`), `api/analysis.ts`(`corrected`)
- 마이그레이션: `V10` additive (신규 테이블)
- 스코프 밖: 보정 목록 관리 화면(조회/삭제), 이름 오분류 학습(image→name), 제공량(grams) 스케일링, 평균 누적
