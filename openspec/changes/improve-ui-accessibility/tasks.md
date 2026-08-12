# Tasks: improve-ui-accessibility

> 전부 프론트엔드. PR 하나로 간다(공용 프리미티브 수정이라 쪼개면 중간 상태가 어정쩡해진다).
> 완료 판정은 "고쳤다"가 아니라 **테스트·빌드 통과 + 해당 시나리오 확인**이다.

## 1. 색 대비 (TDD)

- [x] 1.1 `lib/contrast.ts` — 상대휘도·대비비 계산 (순수 함수, 테스트 먼저)
- [x] 1.2 `theme/tokens.ts` — `@theme` 값을 TS 상수로 노출 (면/글씨 구분이 이름에 드러나게)
- [x] 1.3 대비 테스트 — 글씨용 토큰 전부가 실제 쓰이는 배경 위에서 4.5:1 이상
- [x] 1.4 `index.css` — `-ink` 짝 4개 추가 (`carb`·`protein`·`fat`·`brand`), 면 토큰은 그대로
- [x] 1.5 `--color-muted` `#94a3b8` → `#5b6878` (설계의 `#64748b`는 track 위에서 미달 — 아래 참조)
- [x] 1.6 사용처 교체 — 매크로 칩·사진 배지·활성 탭 라벨 등 **글씨로 쓰인 자리**만 `-ink`로
- [x] 1.7 ~~비활성 카운트 배지 배경 낮추기~~ — **불필요해짐.** muted를 더 어둡게 잡으면서 `border` 배경 위에서도 4.61:1이 나온다
- [x] 1.8 그래픽은 면으로 유지 — 추세선·스파크라인·칼로리 링 호는 `text-brand` 그대로
- [x] 1.9 브랜드 면 위 흰 글씨(2.86:1)는 `KNOWN_EXCEPTIONS`로 명시 — 유지 결정(아래 참조)

## 2. 바텀시트 다이얼로그 규약

- [x] 2.1 `useDialog` 훅 — 열 때 포커스 이동·Esc 닫기·Tab 순환·닫을 때 포커스 복귀·배경 스크롤 잠금
- [x] 2.2 `Sheet`에 훅 연결
- [x] 2.3 딤을 `<button>` → `<div onClick>` + `aria-hidden`
- [x] 2.4 **`Sheet`가 닫기 버튼을 직접 제공** — 시트 3곳에 닫기 수단이 아예 없어, 딤만 뺐으면 닫을 길이 사라졌다
- [x] 2.5 `ItemEditSheet`를 `Sheet`로 통합 — 자체 껍데기에 같은 결함이 있었다
- [x] 2.6 `overscroll-contain` + 하단 `env(safe-area-inset-bottom)`
- [x] 2.7 테스트 8개 — Esc·포커스 이동/가둠(정·역방향)·복귀·딤이 접근성 트리에 없음·딤 클릭 동작·스크롤 잠금

## 3. 포커스 표시

- [x] 3.1 `form.tsx` — 입력·버튼에 `focus-visible` 링
- [x] 3.2 `AiRecordPanel` 설명 textarea, `AnalysisResultSheet` 재분석 입력
- [x] 3.3 `SearchField` — `focus:` → `focus-visible:`, `name`·`autocomplete`·`enterKeyHint` 추가
- [x] 3.4 범위 밖 화면의 `outline-none` 5곳도 수정 — 체중·온보딩(2)·위저드·코치. 남겨두면 "포커스를 고쳤다"가 거짓이 된다

## 4. ARIA 정리

- [x] 4.1 `SegmentedTabs` — `role="tab"` 제거, `role="group"` + `aria-pressed` 버튼으로 (D3)
- [x] 4.2 `RecordsPage.test`의 `role="tab"` 질의를 새 규약에 맞춤(8건)
- [x] 4.3 오류 안내를 `role="alert"` + `text-danger`로 — `AiRecordPanel`(전부 실패 경로), `AnalysisResultSheet`·`ProfileEditSheet`(성공/실패 섞여 있어 `kind`로 분기)
- [x] 4.4 `AddFoodPanel`은 성공 안내뿐이라 `role="status"` 유지 — 확인만
- [x] 4.5 테스트 — 세그먼트가 tabs가 아닌 눌림 버튼으로 노출·묶음 이름·선택 전달

## 5. 모바일 터치

- [x] 5.1 탭 대상 44px — 세그먼트(`min-h-11`)·하단 내비(`min-h-11`)·시트 닫기(`h-11 w-11`)·검색 취소(패딩 확장)
- [x] 5.2 `touch-manipulation` — 버튼·세그먼트·내비·FAB·사진 배지·시트 닫기
- [x] 5.3 하단 내비 `safe-area` 이미 반영됨 — 회귀 없음 확인

## 6. 문서 메타

- [x] 6.1 `index.html` — `lang="ko"`, `<title>kcalog · AI 식단 관리</title>`, `theme-color` = `--color-canvas`
- [x] 6.2 `theme-color`가 `canvas`와 묶여 있음을 `DESIGN.md`에 명시

## 7. 문서·도구

- [x] 7.1 `frontend/DESIGN.md` — 면 3층·라운드 3단계·테두리·글자 두께·아이콘·빈 상태·접근성 최소선·자주 밟은 지뢰
- [x] 7.2 `AGENTS.md`에 포인터
- [x] 7.3 `web-design-guidelines` 스킬 레포 포함 + `skills-lock.json`
- [x] 7.4 `DESIGN.md`의 대비·키보드·ARIA 절을 구현 결과에 맞춰 갱신(면/글씨 표, 예외, `Sheet` 사용 규칙)

## 8. 마무리

- [x] 8.1 `npm test`(241) · `npm run build` · `openspec validate --strict` 통과
- [x] 8.2 구현 중 설계와 어긋난 결정을 `design.md`에 반영
- [x] 8.4 나머지 화면 전수 검토 — 안티패턴(`<div onClick>`·`transition-all`·`autoFocus`·줌 차단)은 **하나도 없었다.** 새로 나온 9건은 접근성이 아니라 UX·성능이라 **별도 change로 뺀다**(기록 삭제 확인 없음·사진 크기 누락으로 인한 CLS·`tabular-nums` 부재·`loading="lazy"` 부재 등)
- [ ] 8.3 **실기기 확인** — 바텀시트 안전 영역, 탭 지연, 포커스 링. 에뮬레이터로는 안 잡힌다
