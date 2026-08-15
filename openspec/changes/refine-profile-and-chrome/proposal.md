# refine-profile-and-chrome

## Why

실사용 중 눈에 걸린 것들이다. **일곱 개가 흩어져 있지만 결은 둘이다** — 프로필이 반쪽만 고쳐진다는 것, 그리고 앱을 감싸는 껍데기(헤더·여백·라벨·확대)가 화면을 갉아먹는다는 것.

**프로필이 반쪽이다.** 프로필 카드는 성별·키·나이·활동 넉 줄을 보여주는데 **편집 시트에서 고칠 수 있는 건 키·활동 둘뿐이다.** 나이와 성별은 온보딩에서 한 번 받고 그 뒤로 손댈 수 없다. 둘 다 유지칼로리 공식(Mifflin-St Jeor)에 직접 들어가는 값이라, 잘못 넣으면 그 뒤의 모든 계산이 계속 틀어진 채로 남는다.

거기에 **진입점 두 개가 같은 곳으로 간다.** 설정 메뉴의 "프로필 편집"과 영양 목표 카드의 "✎ 조정"이 **똑같은 시트를 연다.** 버튼이 둘인데 갈 곳이 하나면 하나는 거짓말이다. 정작 프로필에서 하고 싶은 일 — 지금 프로필로 유지칼로리를 다시 계산해 목표에 반영하기 — 은 **체중 탭에 숨어 있다.**

**껍데기가 화면을 먹는다.**

- 헤더의 `kcalog.ai` + "AI 식단 · 탄단지 코칭" 두 줄이 **모든 화면 맨 위 56px를 상시 차지한다.** 서비스명은 `kcalog`로 확정됐는데(AGENTS.md) 헤더만 `.ai`가 남아 있다.
- 체중·AI PT는 **첫 요소에 `mt-4`가 붙어 셸의 `pt-4`와 겹친다.** 32px 공백으로 시작한다. 홈은 `-mt-1`로 당겨 놓았고 리포트는 없다 — 두 화면만 어긋나 있다.
- 체중 추세 범위 토글이 `1주 / 1월 / 3월`이다. "3개월"을 줄인 것인데 **날짜로 읽힌다.** 실제로 "3월이 왜 나오냐"는 물음이 나왔다 — 라벨이 제 일을 못 하고 있다.
- 모바일에서 **핀치로 화면이 축소된다.** 고정 폭 모바일 앱인데 확대·축소가 열려 있어 레이아웃이 깨진 채로 남는다.
- 리포트 날짜 범위가 `8월 9일 – 8월 15일`인데, 한국어 표기에서 기간은 `~`가 관용이다.
- 즐겨찾기 탭에 검색창이 있다. **내가 저장한 것들이라 몇 개 안 되고 이미 다 보인다** — 목록보다 검색창이 먼저 오면 자리만 차지한다.

## What Changes

**프로필**

- **나이(출생연도)·성별을 편집할 수 있게 한다** — `PATCH /api/members/me`에 두 필드를 연다. 프로필 카드가 보여주는 넉 줄이 모두 고칠 수 있는 값이 된다.
- **"유지칼로리 다시 계산" 시트를 만든다** — 현재 유지칼로리와 계산 근거(실측/공식), 추천 목표를 보여주고 적용한다. 영양 목표 카드의 `✎ 조정`이 이 시트를 연다.
- 설정 메뉴의 "프로필 편집"은 그대로 편집 시트를 연다. **두 진입점이 서로 다른 곳으로 간다.**

**껍데기**

- 헤더를 **`kcalog` 한 줄로** — `.ai`와 부제를 뺀다.
- 체중·AI PT의 첫 요소 여백을 홈·리포트와 맞춘다.
- 추세 범위 라벨을 **`1주 / 1개월 / 3개월`**로.
- **확대·축소를 잠근다** — viewport 메타 + `touch-action` + iOS 제스처 차단.
- 리포트 날짜 범위 구분자를 **`~`**로.
- **즐겨찾기 탭에서 검색창을 뺀다** — "자주 먹는"(공통 카탈로그)에는 그대로 둔다.

## Impact

- Affected specs: `member-profile`(수정), `app-shell`(추가), `weight-tracking`(추가), `food-catalog`(수정), `meal-logging`(추가), `daily-dashboard`(추가)
- Affected code (백엔드): `UpdateMemberRequest`, `Member.updateProfile`, `MemberService.updateProfile` — 출생연도·성별 허용. 마이그레이션 없음(컬럼은 이미 있다)
- Affected code (프론트): `shell/AppShell.tsx`, `index.html`·`index.css`·`main.tsx`(확대 잠금), `pages/{ReportPage,CoachPage,HomePage}.tsx`, `features/weight/{estimator,WeightPanel}.ts(x)`, `features/profile/{NutritionTargetCard,ProfileEditSheet}.tsx` + `TdeeRecalcSheet`(신설), `features/tdee/TdeeCard.tsx` + `TdeeSummary`(신설), `features/food/{AddFoodPanel,FoodList,FavoriteMealSection,FavoriteMealApplySheet,FoodQuantitySheet,FoodDraftSheet}.tsx`, `features/meal/{mealDefaults,AnalysisResultSheet,AiRecordPanel}` + `RecordButton`(신설)
- 스코프 밖:
  - **체중 탭의 유지칼로리 카드 제거** — 프로필에 시트를 만들지만 체중 탭 카드는 그대로 둔다. 체중을 기록한 직후가 유지칼로리를 볼 가장 자연스러운 순간이다.
  - **닉네임 편집** — 카카오에서 받아온 값이라 출처 정리가 따로 필요하다.
  - **확대 잠금의 대체 수단(본문 글자 크기 설정)** — 확대를 막으면 저시력 사용자의 수단을 하나 빼앗는다. 대체 수단은 별도로 다룬다(design D5).
