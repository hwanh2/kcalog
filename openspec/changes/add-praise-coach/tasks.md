# 태스크: 칭찬하는 새싹 코치

## 1. 저장소

- [x] 1.1 `V21__praise.sql`. `praise` 테이블: `id`, `member_id`, `kind`, `dedupe_key`, `message`, `source`, `created_at`, `dismissed_at`
- [x] 1.2 `UNIQUE (member_id, dedupe_key)`. 동시 요청이 같은 칭찬을 두 번 만드는 것을 DB가 막는다 (D4)
- [x] 1.3 `member_id` 외래키에 `ON DELETE CASCADE`. 회원이 지워지면 칭찬도 함께
- [x] 1.4 안 읽은 칭찬 조회용 인덱스. `(member_id, dismissed_at)`
- [x] 1.5 `Praise` 엔티티 + `PraiseKind` enum(FIRST_MEAL, FIRST_WEIGHT, MEAL_STREAK, DAILY_GOAL, WEIGHT_TREND) + `PraiseRepository`
- [x] 1.6 읽음 처리는 도메인 메서드 `dismiss(Instant)`로. 엔티티에 `@Setter`를 두지 않는다

## 2. 판정 규칙 (TDD)

순수 함수라 스펙 시나리오를 실패하는 테스트로 먼저 옮긴다.

- [x] 2.1 `PraiseSignals` 레코드. 식사 기록일 목록, 어제 섭취/목표/감량여부, 7일 추세 변화, 첫 기록 존재 여부
- [x] 2.2 `PraiseRules.detect(signals)` 골격과 실패하는 테스트
- [x] 2.3 첫걸음. 첫 식사 기록, 첫 체중 기록
- [x] 2.4 연속 기록. `WeightStats.streak` 재사용, 이정표 3/7/14/30/60/100 (D9)
- [x] 2.5 경계 테스트. 연속 2일에서는 안 나오고 3일에서 나온다, 4일에서는 3일 이정표를 다시 내지 않는다
- [x] 2.6 하루 목표 달성. `ReportCalc.onTargetDays`와 같은 기준(감량이면 목표 이하, 아니면 10% 밴드) (D9)
- [x] 2.7 체중 추세 하락. 감량 목표 회원만, 추세 변화가 음수일 때 (D10)
- [x] 2.8 우선순위 정렬. 첫걸음 > 연속 > 추세 > 하루 목표 (D6)
- [x] 2.9 `dedupe_key` 생성 규칙 테스트. D4 표와 일치하는지

## 3. 신호 수집

- [x] 3.1 식사 기록이 있는 서비스일 목록을 얻는다. `MealDailyIntake.byDate`의 키셋이 그대로 그 목록이라 리포지토리는 고치지 않았다 (D19)
- [x] 3.2 `PraiseSignalsCollector`. 필요한 네 가지만 모은다. `CoachingSignalsCollector`를 쓰지 않는 이유를 주석으로 남긴다 (D8)
- [x] 3.3 서비스일 경계 확인. 식사는 `ServiceDay`, 체중은 달력 날짜다. 섞으면 00~05시에 하루가 어긋난다

## 4. 문구

- [x] 4.1 `PraisePrompt`. `CoachingPrompt.PERSONA`를 공유하고 사건 설명을 붙인다 (D1)
- [x] 4.2 톤 지시. 밝게 기뻐하되 이모지와 느낌표를 절제, 한 문장, 데이터에 없는 수치 금지
- [x] 4.3 규칙 폴백 문구를 사건 종류마다 하나씩 둔다(고르는 로직은 두지 않는다. 생성 실패는 드물고, 골라 쓰면 같은 사건에 말이 달라져 오히려 어색하다)
- [x] 4.4 LLM 실패 시 폴백으로 **저장**하고 `source=RULE`. 저장하지 않으면 화면을 옮길 때마다 재시도가 돈다 (D3)

## 5. 서비스와 API

- [x] 5.1 `PraiseService.current(memberId)`. 안 읽은 칭찬이 있으면 감지 없이 그것만 반환 (D7)
- [x] 5.2 없을 때만 감지 → 새 사건이면 문구 생성 → 저장 → 반환
- [x] 5.3 `DataIntegrityViolationException` 처리. UNIQUE 위반은 경쟁에서 진 것이므로 저장된 것을 읽는다 (D4)
- [x] 5.4 LLM 호출을 트랜잭션 밖에 둔다. 브리핑과 같은 이유(커넥션 점유, rollback-only)
- [x] 5.5 `PraiseService.dismiss(memberId, praiseId)`. 남의 칭찬이면 거절
- [x] 5.6 `GET /api/coach/praise`, `POST /api/coach/praise/{id}/dismiss`. 기존 `CoachController`에 붙인다
- [x] 5.7 응답 DTO. 칭찬이 없어도 200에 `{"praise": null}` (D15)

## 6. 백엔드 통합 테스트

- [x] 6.1 칭찬이 없으면 빈 응답
- [x] 6.2 사흘 연속 기록 후 조회하면 연속 칭찬이 나온다
- [x] 6.3 닫으면 다시 나오지 않는다
- [x] 6.4 같은 이정표에 다시 도달해도 나오지 않는다 (D5)
- [x] 6.5 LLM 실패 시 폴백 문구로 저장되고, 다시 조회해도 LLM을 부르지 않는다
- [x] 6.6 남의 칭찬은 닫을 수 없다
- [x] 6.7 안 읽은 칭찬이 있으면 감지가 돌지 않는다

## 7. 캐릭터

- [x] 7.1 `features/coach/SproutIcon.tsx`. 다색 SVG, `ui/icons.tsx` 밖에 둔다 (D13)
- [x] 7.2 새싹 색을 `index.css`의 `@theme`에 추가
- [x] 7.3 같은 값을 `theme/tokens.ts`의 `SURFACE`에 추가. 한쪽만 고치면 대비 검증이 실제 화면과 어긋난다
- [x] 7.4 화분은 기존 brand 계열을 쓴다. 새 색을 필요 이상으로 늘리지 않는다

## 8. 말풍선과 셸

- [x] 8.1 `api/coach.ts`에 `getPraise`, `dismissPraise`
- [x] 8.2 `features/coach/CoachFab.tsx`. 얼굴은 AI PT로 가는 링크, 칭찬이 있으면 말풍선
- [x] 8.3 본문과 닫기를 별개 요소로 (D11)
- [x] 8.4 접근성. 얼굴에 `aria-label="AI 코치"`, 말풍선은 `role="status"`, 닫기 터치 영역 44px
- [x] 8.5 등장 모션에 `prefers-reduced-motion` 반영
- [x] 8.6 `AppShell`에서 카메라 FAB을 `CoachFab`으로 교체, 숨김 조건에 AI PT 탭 추가 (D12)
- [x] 8.7 폴링하지 않는다. 화면 진입과 포커스 복귀에서만 (D14)

## 9. 프론트 테스트

- [x] 9.1 칭찬이 없으면 얼굴만 보인다
- [x] 9.2 칭찬이 있으면 말풍선이 뜬다
- [x] 9.3 닫으면 `dismissPraise`가 불리고 말풍선이 사라진다
- [x] 9.4 본문을 누르면 AI PT로 이동한다
- [x] 9.5 음식기록 탭과 AI PT 탭에서는 코치가 없다
- [x] 9.6 기존 `AppShell.test.tsx`의 카메라 FAB 테스트를 코치 FAB 기준으로 고친다

## 10. 마무리

- [x] 10.1 `cd backend && ./gradlew test`
- [x] 10.2 `cd frontend && npm test && npm run lint && npx tsc -b`
- [ ] 10.3 **실기기 확인**. 말풍선이 하단 내비와 안전 영역을 피하는지, 닫기가 눌리는지. 여기에 앞선 change들에서 이월된 항목(바텀시트 안전 영역, 탭 지연, 포커스 링, 사진첩 선택지)을 함께 본다
- [ ] 10.4 촬영 진입이 실제로 불편해지지 않았는지 확인. 체중, 리포트 탭에서 촬영까지 몇 번 누르는지
