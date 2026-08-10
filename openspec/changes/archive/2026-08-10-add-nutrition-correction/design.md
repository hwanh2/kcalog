# Design: add-nutrition-correction

## Context

현재: 비동기 워커(`AnalysisWorker`)가 `MealAnalysisService.analyzeImage(byte[], contentType)`로 Vision 분석 → `analysis_job.result_json`에 저장 → 프론트 확인 → `POST /api/meals`(`MealService.save`, 이미 `@Transactional`)로 확정 저장. 외부 영양 DB 없음. 결정은 사용자 그릴링(2026-08-10)으로 확정.

## Decisions

### D0. 접근 — A+B 계층 (그릴링 확정)
개인 보정을 두 층으로 적용한다.
- **A. 코드 결정적 덮어쓰기** — 정규화 이름 완전일치 항목을 저장된 보정값으로 대체. 사용자가 *명시적으로 고친 값*의 정확 재현을 보장(wedge의 신뢰).
- **B. 프롬프트 주입** — 보정 이력을 Vision 프롬프트에 실어 AI가 *안 고친 유사 음식·다른 양*을 개인화(일반화).
- 충돌 없음: B는 미정정 항목을 똑똑하게, A는 정정 항목을 정확히. AI가 이미 보정값을 주면 A는 no-op, 흔들리면 A가 교정.
- 순수 B(주입만) 대안은 정정값 정확 재현 보장이 없어("520으로 고쳤는데 505") 기각. 순수 A 대안은 유사 음식 일반화를 못 해 B를 후속으로 미룰 수 있으나, 이번 change에서 함께 도입.

### D1. 보정 단위 — 확정 영양값 세트 통째로 (그릴링 확정)
`food_correction`에 kcal·탄·단·지 절대값을 저장. 현재 AI가 제공량(grams)을 주지 않아 값이 "밀도×제공량"으로 뭉쳐 있다. 제공량 분리·스케일링은 grams 도입이 선행돼야 하므로 별도 change. 한계: 같은 음식이라도 양이 다르면 같은 값이 적용됨(정교함↓, 단순함·예측가능성↑).

### D2. 누적 — 명시적 정정 + 최신값 덮어쓰기 (그릴링 확정)
쓰기 트리거는 *사용자가 값을 고치고 "기억하기"를 켠 저장*뿐(매 저장 자동 반영 아님). 재정정 시 upsert로 최신값 덮어쓰기(last-write-wins). 평균 누적은 (1)예측 불가("480이라 했는데 왜 500"), (2)합계·횟수 저장 복잡, (3)양 노이즈 오염으로 기각. 평균은 grams 도입 후 "평소 제공량 평균"으로 재검토.

### D3. 매칭 — 정규화된 음식명 완전일치
매칭 키 = 정규화 이름: **모든 공백 제거** → 영문 소문자화(한글은 대소문자 없음). 한국어 음식명은 띄어쓰기 불일치가 흔해("김치 찌개" vs "김치찌개") 공백을 통째로 제거해 흡수한다. 표시용 원 이름(`food_name_display`)은 별도 보존. 유사도(임베딩) 매칭은 후속. 참고로 B(프롬프트 주입)의 유사 매칭은 AI가 담당하므로, 정규화 완전일치는 A(코드 덮어쓰기)와 upsert 키에만 쓰인다.

### D4. 데이터 모델 — `food_correction`
```
food_correction (
  id BIGSERIAL PK,
  member_id BIGINT NOT NULL FK -> member(id),
  food_name_normalized VARCHAR(100) NOT NULL,   -- 매칭 키
  food_name_display    VARCHAR(100) NOT NULL,   -- 원 표기(표시)
  kcal INT NOT NULL,
  carb_g NUMERIC(5,1) NOT NULL,
  protein_g NUMERIC(5,1) NOT NULL,
  fat_g NUMERIC(5,1) NOT NULL,
  created_at, updated_at (BaseEntity)
)
UNIQUE (member_id, food_name_normalized)
```
`BaseEntity` 상속(Instant/UTC). 상태 변경은 도메인 메서드(`updateNutrition(...)`)로, `@Setter` 금지. 정적 팩토리 `FoodCorrection.of(memberId, display, normalized, kcal, carb, protein, fat)`.

### D5. 적용 흐름 — 워커에서 로드·주입·덮어쓰기
`AnalysisWorker.process`가:
1. `foodCorrectionService.recentFor(memberId, limit)` — 최근 갱신 N개 로드.
2. `mealAnalysisService.analyzeImage(bytes, contentType, corrections)` — 이력을 프롬프트에 주입(B).
3. `foodCorrectionService.applyOverride(result, corrections)` — 정규화 이름 일치 항목을 보정값으로 대체 + `corrected=true`(A).
4. `result_json` 저장.
- 워커는 `memberId`가 필요 → `job.getMemberId()` 사용(이미 있음).
- `analyzeImage` 시그니처에 `List<FoodCorrection>`(또는 경량 뷰) 추가. 이력이 비면 프롬프트는 기존과 **바이트 동일**(eval 세트 그대로 유효). 레거시 동기 `analyze()`는 빈 리스트 전달.

### D6. `corrected` 플래그 — 스키마 밖 후처리 필드
`MealAnalysisResponse.AnalyzedItem`에 `boolean corrected` 추가. AI 구조화 출력 스키마(strict)에는 넣지 않는다 — AI가 채우는 값이 아니라 A 덮어쓰기 후처리에서 설정. Jackson이 AI 응답을 파싱할 때 필드 부재 → `false`, 이후 `applyOverride`가 매칭 항목만 `true`로. `result_json` 직렬화에 포함돼 라운드트립되므로 프론트까지 전달.

### D7. 쓰기 경로 — 저장 시 upsert (별도 엔드포인트 없음)
`MealItemRequest`에 `boolean remember`(기본 false) 추가. `MealService.save`(이미 `@Transactional`)가 `remember=true`인 항목마다 `foodCorrectionService.upsert(memberId, name, kcal, carb, protein, fat)`. 정정 저장이 meal 저장과 한 트랜잭션 — meal 저장 실패 시 보정도 롤백(정합). 설계문서의 `PATCH /food-items/{id}`는 우리 흐름(저장 전 프론트 편집)에 맞춰 저장 통합으로 대체.

### D8. 저신뢰 "확인 필요"
`overallConfidence`가 임계값(`app.analysis.low-confidence-threshold`, 기본 0.7) 미만이면 프론트가 "확인 필요" 표시. 항목별 신뢰도는 현재 없음(전반값만). 정정을 유도해 학습 데이터를 늘리는 장치.

## Risks / Trade-offs

- [프롬프트 주입 토큰·지연] → 최근 N개(기본 50) 상한, 초과 시 잘라내고 로그. 이력 없으면 오버헤드 0.
- [비결정성(B)] → 정정 항목은 A 덮어쓰기로 정확 재현 보장. 미정정 항목만 AI 추론(의도된 일반화).
- [양 노이즈(제공량 미분리)] → 확정값 통째 저장·최신값 덮어쓰기로 완화. grams 도입 시 재설계.
- [보정 오입력] → 다음 정정으로 즉시 교정 가능. 관리 화면(조회/삭제)은 후속.
- [프롬프트가 회원마다 달라져 eval 어려움] → 이력 없으면 기존 프롬프트와 동일, 기존 eval 세트 유지. 개인화 동작은 별도 검증.

## Migration Plan

- `V10__food_correction.sql`: 신규 테이블 + `UNIQUE (member_id, food_name_normalized)`. additive. member_id 단독 인덱스는 두지 않는다 — UNIQUE 복합 인덱스의 선두 컬럼(member_id)이 member_id 단독 조회(recentFor)도 leftmost-prefix로 커버하므로 중복이다.
- `AppProperties`에 `analysis.correction-inject-limit`(기본 50), `analysis.low-confidence-threshold`(기본 0.7) 추가. `application.yml`·`application-prod.yml` 기본값.

## Open Questions (구현으로 확정)

- ~~정규화 유틸 위치~~ → `correction.entity.FoodNames.normalize` static.
- ~~이력 주입 형식~~ → 간결한 텍스트 목록(`- 음식명: NkcaL, 탄 Ng, 단 Ng, 지 Ng`)을 user 메시지의 텍스트 파트로 추가.
- ~~`analyzeImage` 파라미터 타입~~ → 경량 뷰 `correction.dto.PersonalCorrection`(엔티티 미노출).

## 구현 이탈 (design 대비)

- **정규화 규칙 강화**: 최초 "연속 공백 축소"에서 **모든 공백 제거**로 변경(D3). 한국어 음식명 띄어쓰기 불일치("김치 찌개" vs "김치찌개")가 가장 흔한 변형이라, 매칭 키에서 공백을 통째로 제거해 흡수한다(표시명은 별도 보존). TDD 중 실패 테스트로 드러나 결정.
- **`remember`는 `Boolean`(박스 타입)**: Spring MVC의 Jackson(Boot 4)이 record의 primitive 필드 누락 시 400을 내, JSON에 `remember`가 없는 기존 저장 요청이 깨졌다. 코드베이스 관례(요청 record는 `Integer kcal` 등 박스 타입)에 맞춰 `Boolean remember` + `shouldRemember()`로 해결. (반면 `AnalyzedItem.corrected`는 내부 `new ObjectMapper()`로만 파싱돼 primitive 유지 무방.)
- **"확인 필요" 임계값은 프론트 상수**: 백엔드가 플래그를 계산하지 않고 `overallConfidence`만 응답하므로, 임계값(0.7)은 프론트 `LOW_CONFIDENCE_THRESHOLD`에 둔다(불필요한 백엔드 설정 회피). `correction-inject-limit`만 백엔드 설정.
