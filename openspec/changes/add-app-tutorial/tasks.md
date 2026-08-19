# 태스크

## 1. 완료 여부 저장 (백엔드)

- [x] 1.1 `V23__member_tutorial_completed.sql`. `BOOLEAN NOT NULL DEFAULT FALSE`, 백필 없음 (D8)
- [x] 1.2 `Member.tutorialCompleted` 필드 + `completeTutorial()`, `restartTutorial()` 도메인 메서드.
      엔티티에 `@Setter`를 열지 않는다
- [x] 1.3 `MemberResponse.tutorialCompleted` 추가
- [x] 1.4 `MemberService.completeTutorial`, `restartTutorial`
- [x] 1.5 `MemberController`. `POST /api/members/me/tutorial`(완료), `DELETE`(다시 보기)
- [x] 1.6 `MemberIntegrationTest`. 완료 저장, 다시 보기로 되돌림, 기본값이 false,
      **온보딩이 이 값을 건드리지 않는 것**(건드리면 온보딩 직후 안내가 안 뜬다)

## 2. 오버레이 뼈대 (프론트)

- [x] 2.1 `useDialog`에 `lockScroll` 옵션. 기본 true라 기존 시트는 그대로.
      튜토리얼만 끈다 (D4). 잠그면 화면 밖 타겟을 스크롤로 데려올 수 없다
- [x] 2.2 잠금 카운터를 `stack.length`에서 분리. 잠그지 않는 다이얼로그가 먼저 열려 있으면
      그 위에 뜬 시트가 자기가 첫 번째가 아니라고 판단해 **아예 잠그지 않았다**
- [x] 2.3 `features/tutorial/useTargetRect`. `requestAnimationFrame` 루프로 매 프레임 다시 재고,
      값이 같으면 setState를 건너뛴다 (D3). 라우트 전환 직후 타겟이 없는 구간도 이걸로 덮인다
- [x] 2.4 `features/tutorial/Spotlight`. 그림자로 구멍을 만들고 **대상의 라운드를 물려받는다** (D1, D6)
- [x] 2.5 `features/tutorial/TutorialCard`. 점 인디케이터, 건너뛰기, 이전, 다음
- [x] 2.6 `features/tutorial/TutorialOverlay`. 스텝 상태, 스크롤, 라우트 전환, 완료 저장.
      말풍선은 아래에 붙이고 겹칠 때만 위로 넘긴다 (D5)
- [x] 2.7 `index.css`에 등장 keyframes. **말풍선 전체가 아니라 글자 블록에만** 건다.
      전체에 걸면 key로 노드를 갈아야 하는데 그러면 포커스를 가둔 노드가 사라진다

## 3. 스텝과 앵커

- [x] 3.1 `features/tutorial/steps.ts`. `TUTORIAL_IDS` 상수와 6스텝 배열.
      id 문자열을 화면 쪽에도 손으로 적지 않는다 (D2)
- [x] 3.2 `HomePage`. 칼로리, 탄단지 카드에 앵커. 체중은 카드 자체가 Link라 바깥에서 감싼다
- [x] 3.3 `ui/form`의 `Card`에 `id` prop
- [x] 3.4 `CoachFab`에 코치 앵커. 오버레이는 셸에 둔다.
      페이지에 두면 홈에서 음식기록으로 넘어갈 때 언마운트된다 (D7)
- [x] 3.5 `AiRecordPanel`. 사진 영역과 설명 입력에 각각 앵커
- [x] 3.6 스텝이 **자기 화면의 경로**를 든다. 다음 버튼에 달면 이전으로 돌아갈 때 화면이 안 따라온다.
      경로에 **`?camera=1`을 붙이지 않는다** (D7)

## 4. 배선

- [x] 4.1 `api/member`. `tutorialCompleted` 타입, `completeTutorial`, `restartTutorial`
- [x] 4.2 열림 판정을 `member.tutorialCompleted` 하나로. 지역 `finishing`은 플래그가
      거짓으로 돌아오면 함께 푼다 (D9)
- [x] 4.3 `ProfilePage`에 "튜토리얼 다시 보기". 완료 기록만 지운다.
      홈으로 옮기는 일은 오버레이가 스텝의 경로를 보고 한다
- [x] 4.4 `test/utils`의 `makeMember` 기본값을 `tutorialCompleted: true`로.
      false면 셸을 그리는 모든 테스트 위에 안내가 덮인다

## 5. 테스트

- [x] 5.1 `TutorialOverlay.test`. 스텝 진행, 이전, 건너뛰기, 완료 저장 호출, 마지막에서 닫힘,
      이미 본 회원에게 안 뜸, 진행 표시 개수, 스텝별 앵커 존재
- [x] 5.2 홈의 마지막 스텝에서 `/app/records`로 이동하고 촬영이 열리지 않는 것,
      거기서 이전을 누르면 홈으로 함께 돌아오는 것
- [x] 5.3 `ProfilePage.test`. 다시 보기가 되돌리기와 재조회를 호출하는 것
- [x] 5.4 `test/setup`에 `scrollIntoView` 대역. jsdom에는 아예 없어 그 자리에서 죽는다.
      node 환경으로 도는 테스트도 이 setup을 타므로 `typeof Element` 검사가 필요하다
- [x] 5.5 가드를 빼서 실제로 실패하는지 확인
      - 라우트 전환을 빼면 2개 실패 (음식기록 이동, 앵커 존재)
      - 열림 판정과 완료 저장을 빼면 3개 실패 (이미 본 회원, 완료 저장, 건너뛰기)

## 6. 확인

- [x] 6.1 `./gradlew test` 338 passed
- [x] 6.2 `npm test` 484 passed, `npm run build` ok
- [x] 6.3 `openspec validate add-app-tutorial --strict` valid
- [x] 6.4 배치 확인. **jsdom은 레이아웃을 계산하지 않아 여기를 잡지 못한다** (D14)
      390x844 CDP로 재고 스크린샷으로 봤다. 값은 D14의 표에 있다
      - 스팟라이트가 각 타겟을 감싼다. 원형 FAB은 원형으로 (여기서 사각인 걸 발견해 D6을 넣었다)
      - 말풍선이 화면 안에 있고, 원형 FAB 스텝에서만 위로 넘어간다
      - 체중 카드로 스크롤이 실제로 돌아 가운데에 온다 (scrollY 324)
      - 촬영 스텝에서 넘어갈 때 카메라가 열리지 않는다
      ⚠️ 이 측정은 **스텝을 여섯으로 줄이기 전**이다. 지금 대상들도 같은 부류라 표가 그대로
      덮지만(D14), 그 뒤로 다시 재지는 못했다. 이유도 D14에 적었다

## 7. 코치 FAB 병합(PR #54) 대응

- [x] 7.1 마이그레이션을 `V21`에서 **`V23`**으로. main이 V21(praise)과 V22를 먼저 썼다
- [x] 7.2 카메라 FAB이 사라진 자리를 코치가 가져갔다. 기록 방법 설명을 **음식기록 탭**으로 옮긴다
- [x] 7.3 **코치 스텝을 새로 넣는다.** 라벨 없는 그림이 모든 화면 위에 떠 있어, 설명하지 않으면
      정체를 모르는 장식으로 남는다. `CoachFab`의 링크에 앵커를 단다
- [x] 7.4 마지막 축하 카드를 뺀다. 입력 영역을 비춘 채로 끝내야 닫고 나서 할 일이 화면에 남는다
- [x] 7.5 스텝 수가 바뀌어도 안 깨지도록 테스트가 `TUTORIAL_STEPS.length`에서 인덱스를 뽑는다
- [x] 7.6 인사 카드와 탭 스텝을 뺀다. 기록 방법 두 스텝을 음식기록 탭으로 옮긴다. 여덟에서 여섯으로 (D10)

## 8. 남은 것

- [ ] 8.1 실기기 확인. 온보딩을 갓 마친 계정으로 6스텝을 끝까지, 그리고 건너뛰기와 다시 보기.
      PWA는 캐시된 옛 자산을 한 번 더 낼 수 있어 **완전 종료 후 재실행**해야 한다
      - 코치 스텝에서 원형 스팟라이트가 새싹을 감싸는지 (칭찬 말풍선이 떠 있으면 그건 밖에 남는다)
      - 음식기록 두 스텝에서 사진 영역과 설명 입력이 따로 밝아지는지
