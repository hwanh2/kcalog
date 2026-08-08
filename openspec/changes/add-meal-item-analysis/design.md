## Context

add-meal-weight-tracking로 총량 기반 식사 기록(사진→총 칼로리·탄단지→저장)이 동작한다. 이 change는 사용자 요청에 따라 **음식별 분석 + 사진 위 좌표 오버레이 + 음식별 저장**으로 확장한다.

현재 상태:
- 백엔드: `meal`(사진 단위 총량, meal_item 없음), `POST/GET/PATCH/DELETE /api/meals`, `POST /api/meals/analyze`(총량 반환). 분석은 `MealAnalysisPrompt`/`MealAnalysisService`/`OpenAiClient`.
- 프론트: `MealRecordPage`(총량 확인·수정), `RecordsPage`(총량 목록), `features/meal/`.
- 사진은 저장하지 않는 방침 유지.

## Goals / Non-Goals

**Goals:**
- 음식별 분석: 항목(이름·칼로리·탄단지·위치 박스) 배열 + 합계
- 촬영 세션에서 사진 위에 박스+라벨 오버레이 (사진·박스 미저장)
- 좌표 부정확 시 목록형 자동 폴백
- 음식별 수정·추가·삭제, 합계 자동 재계산
- meal_item 저장, meal 합계 재계산, 음식별 조회
- eval로 음식별·좌표 정확도 초기 실측

**Non-Goals:**
- 사진 영구 저장(스토리지), 기록 탭에서 사진+박스 재열람
- 음식 DB 검색·바코드
- 대화형 코치, 주간 리포트

## Decisions

### D1. 분석 출력: 음식별 항목 + 합계 + 위치 박스
구조화 출력 스키마를 재설계한다:
```
{ foodFound, items: [{ name, kcal, carbG, proteinG, fatG, box: {x,y,w,h} }],
  overallConfidence, notes }
```
- `box`는 이미지 정규화 좌표(0~1). 오버레이 렌더링 전용이며 **저장하지 않는다**.
- 합계는 서버·클라이언트 어디서든 items 합으로 계산(별도 total 필드는 두지 않고 파생). 저장 시 meal.total_*에 합계를 비정규화.
- `foodFound=false`면 items 빈 배열 + notes(수동 입력 유도).

### D2. 좌표 부정확 대비 — 목록형 폴백
비전 모델은 음식 인식은 잘 하나 위치는 부정확하다(박스가 어긋나거나 누락). 프론트는:
- 모든 item에 유효한 box가 있고 `overallConfidence`가 임계 이상 → **오버레이 모드**(사진 위 박스+라벨)
- 아니면 → **목록형 모드**(사진은 위에 그대로, 아래 음식 카드 목록)
- 두 모드는 편집·저장 로직을 공유하고 표현만 다르다. eval 결과가 나쁘면 오버레이를 기본에서 내리고 목록형을 기본으로 전환할 수 있게 플래그화.

### D3. meal_item 저장 — 애그리거트 내 객체 참조
`meal`(애그리거트 루트) ↔ `meal_item`(1:N)은 **애그리거트 내부**라 객체 참조(`@OneToMany`, cascade, orphanRemoval)로 매핑한다. (member↔meal 같은 애그리거트 간 참조는 지금처럼 ID 참조 유지.)
- `meal_item(id, meal_id, name, kcal, carb_g, protein_g, fat_g)`. 위치 박스 컬럼 없음(미저장).
- 저장·수정 시 items로 meal_item을 교체하고 meal.total_*를 합계로 재계산(서비스 계층 규칙).
- Flyway `V6__meal_item.sql`, meal FK CASCADE.

### D4. 저장 API — items 수용, 합계 파생
- `POST /api/meals`: `{ eatenAt, mealType, source, items: [{name,kcal,carbG,proteinG,fatG}] }`. 서버가 합계를 계산해 meal에 저장, items를 meal_item으로 저장.
- `PATCH /api/meals/{id}`: items 전체 교체(간명). 부분 항목 수정도 클라이언트가 전체 items로 보낸다.
- `GET /api/meals?date=`: 각 meal에 items 포함.
- 하위호환: source=MANUAL로 items 하나(직접 입력)도 동일 경로.

### D5. 프론트 확인 화면 재작성
`MealRecordPage`의 확인 단계를 오버레이/목록형으로 재작성:
- 사진 미리보기(메모리 blob URL) + 오버레이 또는 목록
- 항목별 이름·영양값 편집, 항목 추가·삭제
- 합계 실시간 재계산 표시
- 저장 → items로 `POST /api/meals`
총량 확인 화면(현재)은 대체된다. 사진 입력·리사이즈·분석 호출·기록 탭 배선은 재사용.

### D6. eval 확장
`eval/` 채점에 음식별 지표 추가: 항목 개수 정확도, 이름 매칭, 항목별 영양 오차, **박스 IoU/위치 정확도**. 초기 실측으로 오버레이 실효성을 판단(D2 플래그 결정 근거).

## Risks / Trade-offs

- [비전 모델 위치 좌표 부정확 → 오버레이 어긋남] → D2 목록형 폴백 + eval 초기 검증. 최악의 경우 목록형 기본.
- [항목 분해로 총 영양 오차가 더 벌어질 수 있음(항목마다 오차 누적)] → 사용자 확인·수정이 안전장치. eval로 총량 대비 오차 비교.
- [사진 미저장이라 기록 탭에서 오버레이 재열람 불가] → 1차 수용. 음식별 목록으로만 재조회.
- [meal_item 도입으로 기존 총량 스키마·API 변경] → 미배포 상태라 V6 additive + API 확장으로 흡수. 총량만 저장된 기존 로컬 데이터는 items 없는 meal로 조회(빈 items 허용).

## Migration Plan

- Flyway `V6__meal_item.sql` additive. meal 테이블은 유지(total_* 그대로, 이제 items 합계).
- 분석 스키마 변경은 배포 전이라 자유. API 변경은 프론트와 함께 배포.
- 롤백: 미배포라 마이그레이션 수정 가능(머지 후 V7+).

## Open Questions

- box 좌표계: 정규화(0~1) vs 픽셀 — 정규화로 시작(리사이즈·해상도 무관). 구현서 확정.
- overallConfidence 임계값 — eval 실측 후 확정.
- PATCH를 items 전체 교체로 할지 항목 단위로 할지 — 전체 교체로 시작(간명), 필요 시 세분화.
