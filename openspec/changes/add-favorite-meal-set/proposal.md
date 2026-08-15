# add-favorite-meal-set

## Why

**사람은 음식을 하나씩 먹지 않는다. 한 상으로 먹는다.**

사진 한 장을 분석하면 "배추김치 · 채소무침 · 계란찜 · 잡곡밥 · 미역국" 다섯 항목이 나오는데, 이걸 다시 먹을 때 지금은 **★을 다섯 번 눌러 하나씩 저장**하고, 다음에 담을 때 **다시 다섯 번 골라야 한다.** 구내식당·집밥처럼 같은 조합이 반복되는 상황이 이 앱의 주된 사용처인데, 그 반복을 줄여주는 수단이 없다.

즐겨찾기는 **스키마 주석부터 조합을 배제**하고 있다.

```sql
-- V15__member_favorite_food.sql
-- 저장 단위는 음식 한 개(조합/세트는 지원하지 않는다).
CONSTRAINT uq_favorite_food_member_name UNIQUE (member_id, name_normalized)
```

즉 화면만 고쳐서는 안 되고 저장 구조가 필요하다.

곁가지로, **개별 ★ 다섯 번은 즐겨찾기 목록도 망가뜨린다.** 한 끼를 저장할 때마다 음식 목록에 다섯 줄이 더해져 "자주 담는 것"을 찾기가 오히려 어려워진다.

## What Changes

- **끼니 세트 저장** — 음식 여러 개를 이름 붙인 한 덩어리로 저장한다. `member_favorite_meal` + `member_favorite_meal_item` 두 테이블을 새로 만든다.
- **두 곳에서 저장한다** — 분석 결과 확인 시트(사진에서 바로), 그리고 이미 저장된 기록 카드(사진 없이 담은 조합도 재사용).
- **즐겨찾기 탭 안에서 불러온다** — 탭을 늘리지 않고 "내 세트" 섹션을 위에 둔다.
- **담을 때 확인을 받는다** — 세트를 누르면 든 음식이 시트로 뜨고, 빼거나 수량을 고친 뒤 그 끼니로 기록한다. 오늘은 밥을 반만 먹었을 수 있다.
- **세트는 개별 즐겨찾기를 만들지 않는다** — 세트 하나 저장에 음식 목록이 다섯 줄 불어나지 않게 한다.

## Impact

- Affected specs: `favorite-meal-set`(신규)
- Affected code (백엔드): `domain/food/`에 `MemberFavoriteMeal`·`MemberFavoriteMealItem` 엔티티/리포지토리, `FavoriteMealService`, `FavoriteMealController`(`/api/favorite-meals`), DTO
- Affected code (프론트): `api/favoriteMeal.ts`(신설), `features/meal/AnalysisResultSheet.tsx`·`features/meal/MealCard.tsx`(저장 진입), `features/food/AddFoodPanel.tsx`·`FoodList` 주변(세트 섹션), 세트 저장·담기 시트 2종
- **마이그레이션: `V18__member_favorite_meal.sql` 신규** — 기존 테이블은 건드리지 않는다
- 스코프 밖:
  - **세트에 사진 붙이기** — 사진은 분석 작업(`analysis_job`)에 매여 있고 보관 정책이 따로 있다. 세트가 사진을 참조하면 그 수명까지 얽힌다.
  - **세트 편집(항목 추가·삭제)** — 저장·삭제만 둔다. 고치려면 지우고 다시 저장한다. 편집 화면은 쓰임을 보고 판단한다.
  - **세트 공유·추천** — 다른 회원의 세트를 가져오는 것은 별개 문제다.
