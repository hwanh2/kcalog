# Tasks: add-meal-item-analysis

## 1. 백엔드: meal_item 저장 (meal-item-storage)

- [x] 1.1 Flyway `V6__meal_item.sql` — meal_item(meal_id FK CASCADE, name, kcal, carb_g, protein_g, fat_g)
- [x] 1.2 MealItem 엔티티 + Meal에 `@OneToMany`(cascade, orphanRemoval) 연관, 항목 교체·합계 재계산 도메인 메서드
- [x] 1.3 `POST /api/meals` items 수용 — 합계 재계산 저장, 항목별 검증. `SaveMealRequest`에 items[]
- [x] 1.4 `GET /api/meals?date=` 응답에 items 포함, `PATCH /api/meals/{id}` items 전체 교체+합계 재계산, `DELETE` 유지
- [x] 1.5 저장·조회·수정·삭제 통합 테스트 — 합계=항목합, 항목 교체, 항목 검증 실패, 타인 접근 404

## 2. 백엔드: 음식별 분석 (meal-item-analysis)

- [x] 2.1 분석 스키마·프롬프트 재작성 — items[{name,kcal,carbG,proteinG,fatG,box}] + overallConfidence + notes (json_schema strict)
- [x] 2.2 `MealAnalysisService`/DTO를 항목 배열 응답으로 변경, 파싱·폴백(음식 미검출) 갱신
- [x] 2.3 분석 테스트 — 다항목 파싱, 음식 미검출(빈 배열), 파싱 실패 폴백 (OpenAiClient 목킹)

## 3. 프론트: 오버레이 확인 화면 (meal-item-analysis)

- [x] 3.1 분석 응답 타입·API 갱신(items+box), 저장 요청을 items로
- [x] 3.2 사진 미리보기 + 오버레이(박스+라벨) / 목록형 폴백 (신뢰도·박스 유효성으로 모드 결정)
- [x] 3.3 음식별 편집·추가·삭제 + 합계 자동 재계산, 저장(`POST /api/meals`)
- [x] 3.4 기록 탭 음식별 표시·수정(항목 편집) — RecordsPage 갱신
- [x] 3.5 프론트 테스트 — 오버레이/목록 모드 분기, 항목 편집·추가·삭제·합계 재계산, 저장, 기록 수정

## 4. eval 확장 (meal-item-analysis)

- [ ] 4.1 채점에 음식별 지표 추가 — 항목 수·이름 매칭·항목별 영양 오차·박스 IoU
- [ ] 4.2 초기 실측 → 오버레이 유지 vs 목록형 기본 결정, design.md에 기록

## 5. 마무리

- [ ] 5.1 E2E 수동 검증 — 실제 사진 다항목 분석→오버레이/목록→편집→저장→기록 음식별 조회·수정
- [x] 5.2 설계 문서(docs) 개정 — 음식별 분석·오버레이(사진 미저장) 반영, 이탈 사항 design.md 정리

## 6. 확인 화면 오버레이-편집 하이브리드 (meal-item-analysis, D2/D5 개정)

- [x] 6.1 `PhotoOverlay`를 탭 가능한 편집 진입점으로 확장 — 박스 라벨에 이름+탄단지 요약, 탭 시 편집 팝오버/바텀시트
- [x] 6.2 편집 팝오버/바텀시트 — 항목 이름·kcal·탄단지 수정·삭제, `mealItems.ts` 검증·변환 재사용
- [x] 6.3 "위치 없는 항목" 칩 영역 — box 없는 항목(추가·수동·박스 미검출) 편집·추가, 하단 총량 표시
- [x] 6.4 `MealRecordPage` 오버레이-편집/리스트 폴백 조합 (`shouldOverlay` 재사용), 기록 탭은 리스트 유지
- [x] 6.5 프론트 테스트 — 박스 탭→편집, 위치 없는 항목 칩 편집·추가, 오버레이↔리스트 폴백, 합계·저장
