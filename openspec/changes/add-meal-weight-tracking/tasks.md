# Tasks: add-meal-weight-tracking

## 1. 프론트 앱 셸·스타일 기반 (app-shell)

- [x] 1.1 Tailwind CSS 도입 — Vite 플러그인 설정, 디자인 토큰(색·간격·타이포) 정의, 전역 리셋
- [x] 1.2 3탭 하단 네비게이션 셸 — 오늘/기록/프로필 탭, 현재 탭 강조, 인증 가드 하위 라우트 구성
- [x] 1.3 기존 화면 편입 — 온보딩·프로필·홈을 셸·스타일에 맞게 이식 (기능 회귀 없이)
- [x] 1.4 앱 셸 테스트 — 탭 이동, 온보딩 미완료 시 셸 미노출

## 2. 백엔드: 체중 (weight-tracking)

- [x] 2.1 `POST /api/weights` — 오늘/지정일 체중 upsert(기존 네이티브 쿼리 재사용), 범위 검증(30~250)
- [x] 2.2 `GET /api/weights?from=&to=` — 기간별 추이 조회(날짜 오름차순), 최신 체중 조회
- [x] 2.3 체중 통합 테스트 — 오늘 기록·같은 날 upsert(1행 유지)·범위 밖 400·기간 조회

## 3. 백엔드: 식사 스키마·CRUD (meal-logging)

- [x] 3.1 Flyway `V4__meal.sql` — meal 테이블(member_id, eaten_at, meal_type, source, total_kcal, carb_g, protein_g, fat_g), FK CASCADE
- [x] 3.2 meal 엔티티·리포지토리 — BaseEntity 상속, source/meal_type enum, 소유권 조회 메서드
- [x] 3.3 `POST /api/meals` — 확인·수정된 영양값 저장(source AI/MANUAL), 범위·음수 검증
- [x] 3.4 `GET /api/meals?date=` — 날짜별 자신의 기록 시각순 조회
- [x] 3.5 `PATCH /api/meals/{id}` · `DELETE /api/meals/{id}` — 소유권 검증(memberId=sub), 타인 접근 404
- [x] 3.6 식사 CRUD 통합 테스트 — 저장·조회·수정·삭제·타인 접근 차단·검증 실패
- [x] 3.7 `DayRange` 순수 단위 테스트 — 날짜별 조회의 시간대 자정 경계(반개구간) 검증
- [x] 3.0 `@LoginMemberId` ArgumentResolver 도입 — Jwt→memberId 추출 중복 제거(Member·Weight·Meal 3곳) [PR #12 리뷰 이월]

## 4. 백엔드: 식사 AI 분석 (meal-logging)

- [ ] 4.1 OpenAI 설정 — `app.openai.*`(api-key, model, 일일 제한) AppProperties, WebClient 빈, application.yml/.env.example 갱신
- [ ] 4.2 분석 서비스 — vision 호출 + 구조화 출력(json_schema strict)으로 {totalKcal, carbG, proteinG, fatG, confidence, notes} 강제, 타임아웃·재시도 1회, 파싱 실패·음식 아님 처리, 원본 응답 로그
- [ ] 4.3 `POST /api/meals/analyze` — 멀티파트 이미지+mealType 수신, 분석 결과 반환(미저장)
- [ ] 4.4 일일 분석 횟수 제한 — 회원당 당일 호출 상한, 초과 시 429
- [ ] 4.5 분석 통합 테스트 — OpenAI 응답 목킹으로 정상 파싱·음식 아님·파싱 실패 폴백·상한 초과 429

## 5. 프론트: 식사 기록 흐름 (meal-logging)

- [ ] 5.1 사진 입력·리사이즈 — `<input capture>` 카메라/갤러리, Canvas 긴 변 1024px·JPEG 80% 압축
- [ ] 5.2 분석 호출·로딩 — analyze 멀티파트 전송, 분석 중 표시, 실패 시 수동 입력 폴백
- [ ] 5.3 확인·수정 화면 — 영양값 표시·수정, 끼니 구분(시간대 기본값), 저장(`POST /api/meals`)
- [ ] 5.4 수동 입력 — 사진 없이 영양값 직접 입력 저장 경로
- [ ] 5.5 기록 조회·수정·삭제 UI — 기록 탭 날짜별 목록, 개별 수정·삭제
- [ ] 5.6 식사 흐름 테스트 — 분석→확인→저장, 수동 입력, 수정·삭제

## 6. 프론트: 대시보드·체중 (daily-dashboard, weight-tracking)

- [ ] 6.1 백엔드 `GET /api/dashboard?date=` — 해당일 meal 집계(총계·잔여·탄단지 비율·타임라인) + 통합 테스트
- [ ] 6.2 오늘 탭 대시보드 — 잔여 칼로리·탄단지·타임라인 표시, TanStack Query 도입(저장 후 무효화로 자동 갱신)
- [ ] 6.3 체중 입력 UI — 기록 탭에서 체중 입력(오늘/지정일)
- [ ] 6.4 체중 추이 그래프 — 기간별 조회 결과 시각화
- [ ] 6.5 대시보드·체중 화면 테스트 — 잔여 계산 표시, 저장 후 갱신, 체중 입력·추이

## 7. 평가 세트 (meal-analysis-eval)

- [ ] 7.1 `eval/` 한식 사진 20~30장 + 기대값(JSON) 수집·정리
- [ ] 7.2 채점 스크립트 — 각 사진 분석→기대값 대비 오차(MAPE 등) 집계, 모델·프롬프트 비교 출력 (수동 실행, CI 비포함)
- [ ] 7.3 GPT-5.4 mini 기준 실측 → nano 강등/5.5 승격 판단, 결과를 design.md에 기록

## 8. 마무리

- [ ] 8.1 E2E 수동 검증 — 사진 촬영→분석→확인·수정→저장→오늘 대시보드 갱신, 체중 입력→추이, 기록 수정·삭제
- [ ] 8.2 `.env.example`·README(로컬 실행 시 OpenAI 키) 갱신, 설계 문서와의 이탈 사항 design.md 반영
