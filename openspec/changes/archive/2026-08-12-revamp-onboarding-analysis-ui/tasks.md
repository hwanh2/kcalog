# Tasks: revamp-onboarding-analysis-ui

## 1. 도메인·스키마
- [x] 1.1 `Goal` enum(CUT/MAINTAIN/BULK) + `Member.goal` 필드·도메인 메서드
- [x] 1.2 Flyway **V12** — `member.goal VARCHAR(10)` nullable
- [x] 1.3 `ActivityLevel`에 `VERY_HIGH(1.9)` 추가

## 2. 계산 (TDD)
- [x] 2.1 `DailyKcalCalculator.toTarget(maintenance, gender, goal)` — 방향 기반 조정·하한·반올림 + 테스트(감량/유지/증량·하한)
- [x] 2.2 목표 체중 없이도 제안 목표가 나오는지 테스트
- [x] 2.3 `TdeeService` 추천 목표를 방향 기반으로(방향 없으면 기존 목표체중 비교로 폴백) + 기존 테스트 유지

## 3. API
- [x] 3.1 `OnboardingRequest` — `targetWeightKg` 선택(@NotNull 제거), `goal` 필수 추가
- [x] 3.2 `Member.completeOnboarding(...)` 시그니처에 goal 반영, 목표 체중 nullable 허용
- [x] 3.3 `KcalSuggestionResponse` — `maintenanceKcal`·탄단지 목표(g) 추가, 쿼리 파라미터에서 목표 체중 선택·goal 필수
- [x] 3.4 `UpdateMemberRequest`/`MemberResponse`에 goal 반영(프로필에서 변경 가능)
- [x] 3.5 통합 테스트 — 목표 체중 없이 온보딩 완료, 방향별 목표 계산, 제안 응답 필드, 검증 오류

## 4. 온보딩 위저드 (프론트)
- [x] 4.1 단계 셸 — 진행 표시(n/5)·STEP 라벨·질문·하단 고정 CTA·뒤로가기
- [x] 4.2 1단계 성별 — 카드 2개 선택
- [x] 4.3 2단계 키·몸무게·나이 — 슬라이더 + 숫자 입력 병행(접근성 라벨)
- [x] 4.4 3단계 활동량 — 옵션 카드 4개(라벨·설명·선택 표시)
- [x] 4.5 4단계 목표 — 방향 3개 + 감량·증량 시 목표 체중(선택) 입력
- [x] 4.6 5단계 완료 — 유지칼로리·목표 섭취량·탄단지·안내 문구·시작하기
- [x] 4.7 `api/member.ts` 타입 갱신(goal·maintenanceKcal·탄단지)
- [x] 4.8 프론트 테스트 — 단계 이동·미선택 차단·뒤로가기 반영·목표 체중 생략 제출·완료 화면 렌더

## 5. 사진 분석 확인 화면 (프론트)
- [x] 5.1 분석 요약 카드 — "분석 결과 · N개 음식" + 총 kcal + 탄단지 3칩
- [x] 5.2 항목 리스트 — 오버레이 모드에서도 표시, 행 탭 → `ItemEditSheet`, 배지(보정됨/확인 필요), "위치 없는 항목" 칩 흡수
- [x] 5.3 저장 버튼에 끼니 라벨 반영("점심으로 저장하기")
- [x] 5.4 프론트 테스트 — 요약 렌더·리스트 탭 편집·오버레이 모드 동시 표시

## 6. 프로필 화면
- [x] 6.1 활동량 4단계·목표 방향 반영, 목표 체중 선택 입력 유지

## 7. 마무리
- [x] 7.1 `./gradlew test` · `npm run build` · `npm test` · `openspec validate --strict` 통과
- [x] 7.2 design.md Open Questions 반영
