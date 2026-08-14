# improve-ui-accessibility

## Why

`revamp-food-record-tab`(PR #33·#34)에서 음식기록 탭과 프로필을 새로 만들면서 **바텀시트·세그먼트 탭·사진 배지 같은 새 상호작용이 대거 들어왔지만, 키보드와 스크린리더로는 한 번도 확인하지 않았다.** Vercel Web Interface Guidelines 스킬로 대표 파일 8개를 훑어보니 화면을 보는 것만으로는 드러나지 않는 문제가 모여 있었다.

**색 대비가 기준에 못 미친다.** `@theme` 토큰 값으로 흰 배경 대비를 계산하면 `muted` 2.56:1, `carb` 2.15:1, `fat` 2.43:1, `brand` 2.86:1로 WCAG AA 본문 기준(4.5:1)에 모두 미달한다. 가장 나쁜 곳은 비활성 세그먼트의 카운트 배지로, `muted` 위 `border` 배경이 **2.08:1**이다. `muted`는 앱 전체의 보조 텍스트라 영향 범위가 가장 넓다.

**바텀시트가 다이얼로그 규약을 지키지 않는다.** `Sheet`는 `aria-modal="true"`를 선언해놓고 Esc로 닫히지 않고(앱 전체에 keydown 핸들러가 없다), 포커스 트랩이 없어 탭이 뒤 배경으로 샌다. 딤 영역이 화면 전체를 덮는 `<button aria-label="닫기">`라 키보드 사용자의 첫 탭 정지점이 거대한 "닫기" 버튼이 된다.

**모바일 PWA인데 모바일 처리가 빠졌다.** 시트에 `overscroll-behavior`가 없어 끝까지 스크롤하면 뒤 페이지가 밀리고, `safe-area-inset-bottom`이 하단 내비에는 있지만 바텀시트에는 없어 아이폰 홈 인디케이터에 버튼이 깔린다. 탭이 잦은 세그먼트·배지에 `touch-action: manipulation`이 없어 더블탭 줌 지연이 남아 있다.

이것들은 **개별 화면의 결함이 아니라 공용 프리미티브(`Sheet`·`form`·`SegmentedTabs`·`@theme`)의 결함**이라, 한 곳을 고치면 소비자 화면 전체가 함께 낫는다.

## What Changes

- **색 토큰 이원화** — 면(배경·막대·버튼·아이콘)은 목업의 비비드한 값을 그대로 두고, **글씨로 쓸 때만** 어두운 짝(`-ink` 접미)을 쓴다. 대비 기준은 텍스트에만 걸리므로 큰 면까지 어둡게 만들 이유가 없다. 목업 v2의 인상을 지키면서 AA를 통과한다.
- **`muted` 자체를 어둡게** — `#94a3b8` → `#64748b`. 보조 텍스트 전용 토큰이라 짝을 만들지 않고 값을 올린다. 눈에 띄는 인상 변화는 거의 없다.
- **비활성 카운트 배지 배경 조정** — 글자만 어둡게 해서는 4.5:1에 닿지 않아(3.86:1) 배경도 함께 낮춘다. 색 두 개를 동시에 손봐야 하는 유일한 자리다.
- **다이얼로그 규약 이행** — `Sheet`에 Esc 닫기·열 때 포커스 이동·포커스 트랩·열림 중 배경 스크롤 잠금을 넣고, 딤을 탭 정지점에서 뺀다.
- **포커스 표시 복구** — `outline-none`에 기대던 자리에 `focus-visible:ring`을 준다. 마우스 클릭에는 링이 뜨지 않도록 `focus:`가 아닌 `focus-visible:`을 쓴다.
- **세그먼트 탭의 ARIA 정리** — `role="tab"`을 반만 구현한 상태(패널 연결·화살표 키 없음)를 걷어내고 `aria-pressed` 버튼으로 바꾼다. 이 컴포넌트는 패널을 전환하지 않고 목록을 거르는 필터라 tabs 패턴 자체가 맞지 않는다.
- **모바일 처리 보완** — 시트에 `overscroll-contain`·`safe-area-inset-bottom`, 탭이 잦은 영역에 `touch-action: manipulation`, 탭 대상 최소 44px.
- **오류를 오류로 알리기** — 분석 실패·429 안내를 `role="status"`+`text-muted`에서 `role="alert"`+`text-danger`로 바꾼다.
- **문서 규칙화** — 반복해서 지적받은 판단 기준(면 3층 구조·라운드 3단계·테두리·아이콘·접근성 최소선)을 `frontend/DESIGN.md`로 고정하고, `AGENTS.md`에서 가리킨다. `web-design-guidelines` 스킬을 레포에 포함해 누구나 같은 기준으로 검토할 수 있게 한다.

## Impact

- Affected specs: `ui-accessibility` (신규) — 색 대비·키보드·다이얼로그·ARIA·터치·모션 기준을 **화면 공통 규범** 하나로 모은다. 화면별 스펙(`meal-logging`·`app-shell` 등)은 손대지 않는다: 같은 규범을 여러 스펙에 흩뿌리면 어긋나고, 앞으로 만들 화면에도 자동으로 적용되어야 하기 때문이다.
- Affected code: `frontend/src/index.css`(`@theme` 토큰), `ui/Sheet.tsx`, `ui/form.tsx`, `ui/SegmentedTabs.tsx`, `ui/SearchField.tsx`, `ui/MacroChips.tsx`, `features/meal/{AiRecordPanel,PhotoOverlay,AnalysisResultSheet}.tsx`, `shell/AppShell.tsx`, `frontend/index.html`(`lang`·`title`·`theme-color`)
- Affected docs: `frontend/DESIGN.md`(신규), `AGENTS.md`, `.claude/skills/web-design-guidelines/`(스킬 추가), `skills-lock.json`
- 마이그레이션: 없음 (프론트 전용)
- 스코프 밖: 다크 모드 도입, 색 팔레트 자체의 재설계(목업 v2 기준 유지), `docs/design-mockup-v2.html` 갱신, 백엔드 변경, 자동화된 접근성 회귀 검사(axe 등) 도입
