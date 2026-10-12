# 태스크

PR은 그룹 단위로 나눈다. 1~4는 사업자 등록이나 콘솔 가입 없이 진행할 수 있다. 5는 사용자가 직접 해야 하는 작업이다.

## 1. 백엔드: 익명 키 로그인 (PR 1)

- [x] 1.1 `Provider`에 `TOSS` 추가. 마이그레이션 없이 기동되는지 확인 (D5)
- [x] 1.2 `AppProperties`에 `apps-in-toss.{base-url, certificate, private-key, timeout}` 추가, `application.yml`에 환경 변수 바인딩. 미설정이 기본 (D5, 키스토어 대신 PEM)
- [x] 1.3 `AppsInTossClient`: PEM 인증서로 mTLS `RestClient` 구성, `exchangeAnonKey(code)`. 인증서가 없으면 꺼진 클라이언트를 등록한다
- [x] 1.4 응답 봉투 해석: `resultType: FAIL`은 코드 무효, 네트워크 오류와 5xx는 장애로 구분 (D5). 스텁 서버로 단위 테스트
- [x] 1.5 `TossAuthService`: 익명 키로 회원 조회 또는 생성, access 토큰 발급. refresh 토큰은 만들지 않는다
- [x] 1.6 `POST /api/auth/toss` + `TossLoginRequest`(`@NotBlank code`). 401, 503, 400 매핑
- [x] 1.7 통합 테스트(`@IntegrationTest`, 앱인토스 클라이언트는 스텁): 신규 회원, 기존 회원, 무효 코드, API 장애, 코드 누락, Set-Cookie 없음, 카카오 회원과 섞이지 않음
- [x] 1.8 `./gradlew test` 통과

## 2. 프론트: 토스 빌드 타깃과 인증 (PR 2)

- [x] 2.1 `@apps-in-toss/web-framework` 설치, React 19와 충돌 없는지 확인 (Risks)
- [x] 2.2 `apps-in-toss.config.ts` 작성: `appName`, `brand.primaryColor`, `webBundleDir`, `permissions`(camera, photos), `webView`(D10), `navigationBar`
- [x] 2.3 `.env.toss`와 `vite.config.ts` 분기: `--mode toss`에서 PWA 플러그인 제외. `package.json`에 `build:toss`(vite build + ait build) 추가 (D1)
- [x] 2.4 `src/platform/`: `IS_TOSS` 상수와 SDK 감싼 `toss.ts`(동적 import). 인터페이스 구조는 버렸다 (D2)
- [x] 2.5 토스 인증: `createAnonymousKeyAuthCode` 후 `POST /api/auth/toss` 호출 (`client.ts`의 `loginWithToss`)
- [x] 2.6 `api/client.ts`: 갱신 함수를 플랫폼별로 교체. 동시 401 단일화 유지, 토스에서 실패 시 `/login` 대신 다시 시도 화면 (D4)
- [x] 2.7 `AuthProvider` 부트스트랩: 토스는 refresh 대신 `authenticate()`
- [x] 2.8 라우팅: 토스 빌드에서 `/`, `/login`, `/auth/callback`은 `/app`으로 이동
- [x] 2.9 테스트: 동시 401에서 재로그인 1회, 재로그인 실패 시 오류 화면, 웹 빌드의 기존 refresh 흐름 회귀 없음
- [x] 2.10 `npm test`, `npm run build`, `npm run build:toss` 통과. 웹 번들에 SDK 코드가 없는지 확인

## 3. 프론트: 토스 화면 적응 (PR 3)

- [x] 3.1 뒤로가기 처리 순서(시트, 화면 핸들러, 히스토리, 종료)와 `backEvent` 연결 (D6)
- [x] 3.2 `WizardShell`: 토스 빌드에서 자체 뒤로가기 버튼 숨김, 단계 되돌리기를 핸들러로 등록
- [x] 3.3 `AppShell` 헤더: 토스 빌드에서 헤더 제거, 프로필 진입은 내비바 기능 버튼으로 (D7)
- [x] 3.4 앱인토스 UX 가이드의 탭바 형태 확인 후 토스 빌드 탭바 구현 (D7, Open Questions)
- [x] 3.5 상단 safe area: 토스 내비바가 WebView 밖에 있다고 보고 코드를 넣지 않았다. 실기기에서 겹치면 추가 (D7, 5.4)
- [x] 3.6 사진 입력: `AiRecordPanel`에서 `platform.pickPhoto` 사용, 권한 거부 안내와 다시 요청 (D8)
- [x] 3.7 생성형 AI 고지: 사진 분석과 AI PT 화면에 늘 보이는 고지, 분석 결과에 AI 추정 표시 (D9)
- [x] 3.8 프로필에서 로그아웃 메뉴 숨김, 설치 안내와 랜딩이 토스 번들에 노출되지 않는지 확인
- [x] 3.9 테스트: 뒤로가기 순서, 토스 셸(로고 없음, 탭 목적지, 로그아웃 없음), 사진 권한 거부와 다시 요청, AI 고지
- [x] 3.10 `npm test`, `npm run build`, `npm run build:toss` 통과

## 3a. 웹과 토스 통일 (2026-10-10 사용자 결정)

- [x] 3a.1 프로필 진입을 토스 내비바 기능 버튼으로 옮기고 토스 빌드의 앱 헤더 제거 (D7)
- [x] 3a.2 생성형 AI 고지와 "AI 추정" 표시를 웹에도 적용 (D9)
- [x] 3a.3 사진 입력을 웹도 "촬영", "앨범" 두 버튼으로 (`PhotoPicker`, D8)
- [x] 3a.4 웹 하단 탭도 떠 있는 알약으로, DESIGN.md 규칙 수정 (D7)
- [x] 3a.5 `npm test`, `npm run build`, `npm run build:toss` 통과, 웹 화면은 브라우저에서 확인

## 4. 정책 점검 (코드 변경이 생기면 PR 4)

- [x] 4.1 AI PT 코치 프롬프트와 응답 처리를 앱인토스 AI 채팅 기준(유해 응답 필터링, 자해 관련 안전 응답)으로 점검하고 결과를 design.md에 기록
- [x] 4.1a 점검 결과 미충족 → 안전장치를 붙이고 AI PT도 함께 출시하기로 결정 (2026-10-10)
- [x] 4.1b `CoachSafety` 판정 로직 TDD (질문: Moderation + 키워드, 답: Moderation만, 평범한 질문 오탐 없음)
- [x] 4.1c `ModerationClient` (OpenAI Moderation, 실패 시 예외)
- [x] 4.1d 코치 스트림에 질문, 답 검사 연결. 걸리면 고정 안전 응답, 사용량 미증가, 검사 실패는 폴백 (D11)
- [x] 4.1e 코치 프롬프트에 거절 규칙 추가
- [x] 4.1f 통합 테스트(자해 질문, 거절, 답 교체, 검사 실패)와 `./gradlew test` 통과
- [x] 4.2 칼로리, 체중 안내 문구가 진단이나 처방으로 읽히는 곳이 없는지 점검
- [x] 4.3 비게임 출시 체크리스트를 항목별로 대조한 표를 design.md에 추가

## 4a. 출시 전 보완 (2026-10-10 사용자 결정)

- [x] 4a.1 테스트용 인증서 파일 제거, 테스트 실행 중 keytool로 생성 (`AppsInTossConfigTest`)
- [x] 4a.2 토스 앱이 옛 버전이면 업데이트 안내 (`createAuthCode`의 update-required, `SessionRetryScreen`)
- [x] 4a.3 `V24__member_delete_cascade.sql`: 외래 키 세 곳에 CASCADE (D12)
- [x] 4a.4 `DELETE /api/members/me`: 기록 삭제, 사진 삭제, refresh 쿠키 만료. 통합 테스트로 모든 회원 테이블이 비는지 확인 (D12)
- [x] 4a.5 프로필의 회원 탈퇴(확인 시트, 웹은 랜딩으로, 토스는 미니앱 닫기)
- [x] 4a.6 `/privacy` 처리방침 페이지와 랜딩, 로그인, 프로필 링크 (D13)
- [x] 4a.7 `./gradlew test`, `npm test`, `npm run build`, `npm run build:toss` 통과, 화면은 브라우저에서 확인
- [x] 4a.7a 닉네임이 없는 토스 회원의 홈 인사말과 프로필 이름 기본값 (D3)
- [x] 4a.7b 온보딩 완료 시 목표별 기본 닉네임 (`DefaultNickname` TDD, D14)
- [x] 4a.7c 프로필 편집에서 닉네임 변경 (백엔드 검증, 프론트 입력과 오류)
- [ ] 4a.8 민감정보 동의, 만 14세 미만 확인, 보호책임자 표기를 출시 전에 확인 (Open Questions)
- [ ] 4a.9 카카오 연결 끊기는 별도 change (D12)

## 4b. UX 가이드 반영 (2026-10-12 사용자 결정, D15)

- [x] 4b.1 앱 화면 문구 해요체로, 코치 프롬프트에 해요체 지시
- [x] 4b.2 확인 시트 왼쪽 버튼 "닫기", 확인 시트의 X 버튼 제거(`Sheet.closeButton`)
- [x] 4b.3 재분석 경고를 `window.confirm`에서 `ConfirmSheet`로
- [x] 4b.4 코치 답, 브리핑, 홈 AI 코칭 카드에 "AI 생성" 배지
- [x] 4b.5 토스 빌드의 메일 링크를 `Device.openURL`로
- [x] 4b.6 콘솔 로고 600×600 파일 생성
- [ ] 4b.7 코치 캐릭터, 그라데이션, 튜토리얼 오버레이는 심사 결과에 따라

## 5. 출시 준비 (사용자 직접)

- [ ] 5.1 앱인토스 콘솔 가입, 워크스페이스 생성, 앱 등록(`appName` 확정)
- [ ] 5.2 mTLS 인증서 발급 가능 여부 확인. 불가하면 사업자 등록 후 진행 (Risks)
- [ ] 5.3 운영 `.env`에 `APPS_IN_TOSS_CERTIFICATE`, `APPS_IN_TOSS_PRIVATE_KEY`(PEM 내용이나 `file:` 위치), `CORS_ALLOWED_ORIGINS`에 토스 origin 두 개 추가 후 재배포
- [ ] 5.4 `npm run build:toss` 후 번들 업로드, QR로 iOS와 Android 실기기 테스트(로그인, 재진입 데이터 유지, 뒤로가기, 카메라)
- [ ] 5.5 익명 키 길이 확인(Open Questions). 100자를 넘으면 마이그레이션 태스크 추가
- [ ] 5.6 로고, 설명, 스크린샷, 처리방침 URL(https://kcalog.site/privacy) 등록 후 검토 요청, 승인 후 출시
