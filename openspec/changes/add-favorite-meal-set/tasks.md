# Tasks: add-favorite-meal-set

> 백엔드(마이그레이션 포함) + 프론트. PR은 **백엔드 / 프론트 두 그룹**으로 나눈다.
> 완료 판정은 "다 했다"가 아니라 **테스트·빌드 통과 + 해당 시나리오 확인**이다.

## 1. 스키마

- [ ] 1.1 `V18__member_favorite_meal.sql` — 세트(`member_favorite_meal`) + 항목(`member_favorite_meal_item`)
- [ ] 1.2 `UNIQUE (member_id, name_normalized)` — 같은 이름 재저장은 덮어쓰기 (D3)
- [ ] 1.3 항목은 세트에 FK + 표시 순서(`sort_order`). 세트 삭제 시 항목도 지운다
- [ ] 1.4 `docker compose down -v && up -d` 후 기동 확인 — `ddl-auto=validate`라 엔티티와 어긋나면 안 뜬다

## 2. 도메인 (백엔드)

- [ ] 2.1 `MemberFavoriteMeal`·`MemberFavoriteMealItem` 엔티티 — 세트가 애그리거트 루트, 항목은 내부 (D1)
- [ ] 2.2 정적 팩토리 + 구성 교체(덮어쓰기) 도메인 메서드. `@Setter` 금지
- [ ] 2.3 **TDD** — 합계 계산(항목 합)은 순수 로직이라 실패하는 테스트부터
- [ ] 2.4 상한 상수 — 항목 30개는 `MealValidation.MAX_ITEMS` 공유, 회원당 세트 50개는 신규 (D6)

## 3. API (백엔드)

- [ ] 3.1 `FavoriteMealService` — 저장(정규화명 upsert)·조회·삭제. 삭제는 소유자 확인
- [ ] 3.2 `FavoriteMealController` — `GET/POST /api/favorite-meals`, `DELETE /api/favorite-meals/{id}`
- [ ] 3.3 DTO — `SaveFavoriteMealRequest`, `FavoriteMealResponse`(합계·항목 수 포함), `Dto` 접미사 금지
- [ ] 3.4 통합 테스트(`@IntegrationTest`) — 저장·조회·덮어쓰기·남의 세트 삭제 거부·항목 상한 초과 400·세트 개수 상한
- [ ] 3.5 **세트가 집계에 안 섞이는지** 확인하는 테스트 — 세트만 저장하고 대시보드·리포트가 그대로인지

## 4. 저장 진입 (프론트)

- [ ] 4.1 `api/favoriteMeal.ts` — 조회·저장·삭제
- [ ] 4.2 세트 저장 시트 — 이름 미리 채움(`"잡곡밥 외 4개"`), 같은 이름이면 덮어쓴다고 알림 (D2·D3)
- [ ] 4.3 `AnalysisResultSheet`에 "통째로 즐겨찾기" (D7)
- [ ] 4.4 `MealCard`에 세트 저장 — 수량·단위 없는 구 기록은 기본값으로 채운다 (D7)
- [ ] 4.5 테스트 — 기본 이름 생성, 덮어쓰기 안내, 저장 요청 내용

## 5. 불러오기 (프론트)

- [ ] 5.1 즐겨찾기 탭에 "내 세트" 섹션 — 음식 목록과 구분, 세트 없으면 자리를 비우지 않는다
- [ ] 5.2 세트 담기 시트 — 항목 목록·빼기·수량 조절 (D4)
- [ ] 5.3 담기는 기존 `POST /api/meals` 사용 — 세트 전용 저장 경로를 만들지 않는다 (D4)
- [ ] 5.4 세트 삭제 — `ConfirmSheet` 사용(되돌릴 수 없는 동작, `ui-feedback` 스펙)
- [ ] 5.5 실패 알림 — `useMutationWithError` + `ErrorNotice` (`ui-feedback` 스펙)
- [ ] 5.6 테스트 — 담기가 고친 대로 나감, 담아도 세트는 안 바뀜, 확인 전에는 안 지워짐

## 6. 마무리

- [ ] 6.1 `./gradlew test` · `npm test` · `npm run build` · `openspec validate --strict` 통과
- [ ] 6.2 구현 중 설계와 어긋난 결정을 design.md에 반영
- [ ] 6.3 **실기기 확인** — `polish-ui-details`에서 이월된 것(바텀시트 안전 영역·탭 지연·포커스 링·로딩 깜빡임·사진첩 선택지) + 세트 시트. **네 번째 이월이라 이번엔 넘기지 않는다**
