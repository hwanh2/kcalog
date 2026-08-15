# Tasks: add-favorite-meal-set

> 백엔드(마이그레이션 포함) + 프론트. PR은 **백엔드 / 프론트 두 그룹**으로 나눈다.
> 완료 판정은 "다 했다"가 아니라 **테스트·빌드 통과 + 해당 시나리오 확인**이다.

## 1. 스키마

- [x] 1.1 `V18__member_favorite_meal.sql` — 세트(`member_favorite_meal`) + 항목(`member_favorite_meal_item`)
- [x] 1.2 `UNIQUE (member_id, name_normalized)` — 같은 이름 재저장은 덮어쓰기 (D3)
- [x] 1.3 항목은 세트에 FK + 표시 순서(`sort_order`). 세트 삭제 시 항목도 지운다(`ON DELETE CASCADE`)
- [x] 1.4 빈 DB에서 마이그레이션·`ddl-auto=validate` 통과 — Testcontainers가 매 실행 처음부터 돌린다

## 2. 도메인 (백엔드)

- [x] 2.1 `MemberFavoriteMeal`·`MemberFavoriteMealItem` 엔티티 — 세트가 애그리거트 루트 (D1)
- [x] 2.2 정적 팩토리 + `rename`·`replaceItems` 도메인 메서드. `@Setter` 없음
- [x] 2.3 도메인 테스트 6개 — 합계·빈 세트·이름 정규화 동기화·띄어쓰기 흡수·구성 교체·소유권
- [x] 2.4 항목 상한은 `MealValidation.MAX_ITEMS` 공유, 회원당 세트 50개는 신규 (D6)

## 3. API (백엔드)

- [x] 3.1 `FavoriteMealService` — 저장(정규화명 upsert)·조회·삭제. 삭제는 소유자 확인
- [x] 3.2 `FavoriteMealController` — `GET/POST /api/favorite-meals`, `DELETE /api/favorite-meals/{id}`
- [x] 3.3 DTO — `SaveFavoriteMealRequest`, `FavoriteMealResponse`(합계·항목 수 포함)
- [x] 3.4 통합 테스트 11개 — 저장·덮어쓰기·띄어쓰기 흡수·조회·삭제·남의 세트 거부·빈 항목·항목 상한·세트 상한·상한에서 덮어쓰기 허용
- [x] 3.5 **세트가 집계에 안 섞이는지** — 세트만 저장하고 대시보드가 `totalKcal: 0`인지 확인

## 4. 저장 진입 (프론트)

- [x] 4.1 `api/favoriteMeal.ts` — 조회·저장·삭제
- [x] 4.2 `FavoriteMealSaveSheet` — 이름 미리 채움, 같은 이름이면 덮어쓴다고 알림 (D2·D3)
- [x] 4.3 `AnalysisResultSheet`에 "☆ 세트로 저장" — 기록 저장과 **같은 검증**을 통과해야 열린다
- [x] 4.4 `MealCard`에 세트 저장 — 수량·단위 없는 구 기록은 기본값(1·인분)으로 채운다 (D7)
- [x] 4.5 테스트 11개 — 기본 이름 4종 + 시트 7종(미리 채움·합계·저장 요청·빈 이름·덮어쓰기 예고·띄어쓰기·실패 알림)

## 5. 불러오기 (프론트)

- [x] 5.1 즐겨찾기 탭에 "내 세트" 섹션 — 음식 목록과 구분, 세트 없으면 아무것도 안 그린다
- [x] 5.2 `FavoriteMealApplySheet` — 항목 빼기·되돌리기·수량 조절 (D4)
- [x] 5.3 담기는 기존 `POST /api/meals` 사용 — 세트 전용 저장 경로를 만들지 않는다 (D4)
- [x] 5.4 세트 삭제는 `ConfirmSheet` (`ui-feedback` 스펙)
- [x] 5.5 실패 알림 — `useMutationWithError`. ⚠️ 삭제 실패는 **확인 시트만** 알린다(섹션에도 두면 같은 문구가 두 곳에서 alert로 읽힌다)
- [x] 5.6 테스트 13개 — 담기 시트 6종·섹션 7종

## 6. 마무리

- [x] 6.1 `./gradlew test` · `npm test`(339) · `npm run build` · `openspec validate --strict` 통과
- [x] 6.2 구현 중 설계와 어긋난 결정을 design.md에 반영 — 상한과 덮어쓰기, 삭제 알림 중복, aria-label, 수량 기본값
- [ ] 6.3 **실기기 확인** — `polish-ui-details`에서 이월된 것(바텀시트 안전 영역·탭 지연·포커스 링·로딩 깜빡임·사진첩 선택지) + 세트 시트. **네 번째 이월이라 이번엔 넘기지 않는다**
