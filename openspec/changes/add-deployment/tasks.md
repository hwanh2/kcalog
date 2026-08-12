# Tasks: add-deployment

배포는 코드보다 "레포 밖에서 해야 할 일"이 많다. 👤 표시는 **사람이 직접** 해야 하는 작업(계정·결제·콘솔 조작)으로, 에이전트가 대신할 수 없다. 나머지는 코드·설정 작업이다.

## 0. 사전 준비 (👤 — 대부분 다른 작업의 선행 조건)

- [ ] 0.1 👤 도메인 `kcalog.site` 구매
- [ ] 0.2 👤 DNS 레코드 — `kcalog.site` → Vercel(안내대로 A/CNAME), `api.kcalog.site` → EC2 Elastic IP(A 레코드)
  - **첫 배포보다 먼저 끝나야 한다.** Let's Encrypt가 `api.kcalog.site`로 직접 접속해 소유를 검증하므로, DNS가 아직 안 퍼졌으면 인증서 발급이 실패하고 배포 워크플로우의 헬스체크가 타임아웃된다(코드 문제가 아니다 — DNS 확인 후 재배포)
- [ ] 0.3 👤 EC2 인스턴스 생성 — **`t3.small`**(x86, 2GB), Ubuntu LTS, **Elastic IP 할당**, 보안 그룹 인바운드 **80·443 둘 다** 개방(SSH는 본인 IP로 제한)
  - `t4g`(ARM)를 쓰면 amd64 이미지가 실행되지 않는다 — 인스턴스 타입을 바꾸려면 워크플로우에 멀티플랫폼 빌드를 먼저 추가할 것
  - 443만 열면 안 된다: 80은 평문 접속을 HTTPS로 돌리는 리다이렉트에 쓰이고, 인증서 챌린지(TLS-ALPN-01)는 443을 쓴다
- [ ] 0.4 👤 VM 초기 세팅 — Docker + compose 플러그인 설치, 배포 전용 사용자 생성 후 docker 그룹에 추가
- [ ] 0.5 👤 배포용 SSH 키쌍 생성(이 용도 전용) — 공개키는 VM의 배포 사용자에, 개인키는 GitHub Secret에
- [ ] 0.6 👤 Cloudflare R2 버킷 2개 생성 — 사진용, 백업용. S3 호환 액세스 키 발급
- [ ] 0.7 👤 카카오 개발자 콘솔 — Redirect URI에 `https://api.kcalog.site/login/oauth2/code/kakao` 추가, 사이트 도메인 등록
- [ ] 0.8 👤 OpenAI 대시보드에서 **월 사용 한도** 설정 (완전 공개라 유일한 비용 천장 — design Risks 참고)
- [ ] 0.9 👤 AWS Budgets 예산 알림 설정
- [ ] 0.10 👤 `release` 브랜치 생성 + 보호 규칙 — CI 통과 필수, 직접 푸시 제한(핫픽스 예외는 본인만)
- [ ] 0.11 👤 ghcr 패키지는 **private 유지**. VM이 pull할 수 있도록 PAT 발급 → `GHCR_PULL_TOKEN`
  - 스코프는 **`read:packages`만** 준다. VM에 저장되는 자격증명이라, 유출되더라도 이미지 읽기 외에는 아무것도 못 하게 막는다(코드 접근·push 불가)
  - 첫 배포 후 GitHub 패키지 설정에서 이 레포와 연결(Package settings → Manage Actions access)
- [ ] 0.12 👤 GitHub Secrets 등록
  - 접속: `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY`, `GHCR_PULL_TOKEN`
  - `SSH_KNOWN_HOSTS` — VM에서 `ssh-keyscan -H <Elastic IP>` 결과를 그대로 등록. **없으면 배포가 실패한다**(고의) — 러너는 매번 새로 뜨므로 그때그때 keyscan하면 매 배포가 호스트 무검증 신뢰가 되고, 그 채널로 운영 시크릿 전량이 나간다
  - 인증서: `ACME_EMAIL` (Let's Encrypt 만료 알림 수신 주소)
  - 앱: `FRONTEND_BASE_URL`(`https://kcalog.site`), `CORS_ALLOWED_ORIGINS`(`https://kcalog.site`), `DB_PASSWORD`, `JWT_SECRET`(32바이트 이상 랜덤), `KAKAO_CLIENT_ID`, `KAKAO_CLIENT_SECRET`, `OPENAI_API_KEY`
  - 스토리지: `STORAGE_BUCKET`, `STORAGE_ENDPOINT`, `STORAGE_REGION`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`
  - 백업: `BACKUP_BUCKET`, `BACKUP_ENDPOINT`, `BACKUP_ACCESS_KEY`, `BACKUP_SECRET_KEY`
  - 프론트: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
- [ ] 0.13 👤 Vercel 프로젝트 연결 — 루트 디렉터리 `frontend`, Git 자동배포는 프리뷰만(운영은 배포 워크플로우가 담당), 환경변수 `VITE_API_BASE_URL=https://api.kcalog.site`

## 1. 백엔드 코드 (운영에서 깨지는 것 수정)

- [x] 1.1 `build.gradle.kts`에 actuator 의존성 추가
- [x] 1.2 `application.yml` — `server.forward-headers-strategy: framework`, actuator 노출을 `health`로 한정, `show-details: never`
- [x] 1.3 `AppProperties`에 CORS 허용 출처(`app.cors.allowed-origins`) 추가. 로컬 기본값은 빈 목록(Vite 프록시라 불필요)
- [x] 1.4 `SecurityConfig` — `CorsConfigurationSource` 빈 등록(허용 출처·메서드·`Authorization` 헤더·`allowCredentials=true`), `http.cors(...)` 활성화, `/actuator/health` permitAll
- [x] 1.5 `application-prod.yml` — `CORS_ALLOWED_ORIGINS` 필수 주입으로 추가
- [x] 1.6 테스트 — CORS 허용/차단·와일드카드 없음(`SecurityConfigCorsTest`), 헬스체크 미인증 200·상세 비노출·다른 actuator 미노출(`HealthEndpointIntegrationTest`)
- [x] 1.7 `./gradlew test` 통과

## 2. 컨테이너화

- [x] 2.1 `backend/Dockerfile` — 멀티스테이지(Gradle 빌드 → JRE 21 런타임), 비root 사용자로 실행
- [x] 2.2 `backend/.dockerignore` — 빌드 캐시·테스트 산출물 제외
- [x] 2.3 `deploy/compose.prod.yml` — traefik·backend·postgres 3개 서비스. backend·postgres는 호스트 포트 미노출, `restart: unless-stopped`, 로그 드라이버 용량 제한, postgres 볼륨 영속화, `SPRING_PROFILES_ACTIVE=prod`
- [x] 2.4 Traefik 설정 — compose command로 엔트리포인트·HTTPS 리다이렉트·Let's Encrypt(TLS-ALPN-01), backend 라벨로 `api.kcalog.site` 라우팅. `exposedbydefault=false`로 라벨 없는 서비스 미노출
- [x] 2.5 로컬 `docker build` + 실행 검증 — 빌드 성공(830MB), 비root(uid 10001) 실행, 시크릿 누락 시 기동 실패, 전체 주입 시 헬스체크 200·`/actuator/env` 401·허용 출처 preflight 통과·미허용 출처 403 확인

## 3. 배포 파이프라인

- [x] 3.1 `.github/workflows/deploy.yml` — `on: push: branches: [release]`
- [x] 3.2 백엔드 잡 — 이미지 빌드 → `ghcr.io`에 커밋 SHA + `latest`로 push (서드파티 액션은 SHA 핀 고정)
- [x] 3.3 배포 스텝 — SSH로 VM 접속 → Secrets로 `.env` 생성(권한 0600, 로그에 값 미출력) → SHA 이미지 pull → `compose up -d`
- [x] 3.4 배포 확인 스텝 — 공개 주소 `/actuator/health`가 정상을 응답할 때까지 재시도, 실패 시 워크플로우 실패 처리
- [x] 3.5 프론트 잡 — 같은 커밋에서 Vercel 운영 배포
- [x] 3.6 워크플로우 권한 최소화 (`packages: write`는 이미지 잡에만)
- [x] 3.7 배포 커밋을 실행 요약에 기록 (release는 계속 움직이므로 무엇이 나갔는지 남긴다)

## 4. 프론트 배포 설정

- [x] 4.1 `frontend/vercel.json` — 정적 자산 외 모든 경로를 `index.html`로 rewrite (SPA 폴백)
- [x] 4.2 운영 빌드에서 `VITE_API_BASE_URL`이 반영되는지 확인 (`api/client.ts`의 `API_BASE` — 코드 변경 불필요)
- [x] 4.3 `index.html` 정리 — `lang="ko"`, 제목 `frontend` → `kcalog`, description·theme-color. PWA manifest에 설명·언어·테마색(앱 배경과 일치)
- [ ] 4.4 PWA 아이콘 — 설치 배너·홈 화면용 192/512 png 추가 (현재 favicon.svg만 등록돼 있어 안드로이드 설치 배너가 뜨지 않는다)

## 5. 백업

- [x] 5.1 `deploy/backup.sh` — compose exec `pg_dump` → 압축 → R2 업로드, 크기 검증, 14일 지난 백업 삭제
- [ ] 5.2 👤 VM cron에 일 1회 등록
- [ ] 5.3 **복구 검증** — 백업 파일을 빈 DB에 복원해 실제로 살아나는지 확인 (백업은 복구해 봐야 백업이다)

## 6. 첫 배포·검증

- [ ] 6.1 main → `release` 머지로 첫 배포 실행
- [ ] 6.2 HTTPS 인증서 발급 확인 (`https://api.kcalog.site/actuator/health`)
- [ ] 6.3 Flyway V1~V17이 빈 운영 DB에 정상 적용됐는지 확인
- [ ] 6.4 **카카오 로그인 전체 흐름** — 로그인 → 콜백 → 프론트 복귀 → 새로고침 후 세션 유지(refresh 쿠키가 same-site로 전달되는지)
- [ ] 6.5 사진 분석 → R2 업로드 → 썸네일 표시
- [ ] 6.6 AI 코치 **SSE 스트리밍**이 Traefik을 통과해 끊기지 않는지 — `text/event-stream`은 즉시 flush되는 게 기본 동작이라 설정을 넣지 않았다. 실제로 토큰이 실시간으로 오는지 눈으로 확인할 것
- [ ] 6.7 딥링크 확인 — `https://kcalog.site/weight` 직접 진입·새로고침
- [ ] 6.8 VM 실사용 메모리 확인 (t3.small 2GB에서 여유가 있는지)

## 7. 문서

- [x] 7.1 AGENTS.md — 서비스명 kcalog·도메인 확정 반영, `release` 브랜치 배포 규칙 추가
- [x] 7.2 README — 운영 구성도, 배포 방법(release 머지), 롤백·역머지 주의 추가
- [x] 7.3 `.env.example` — `CORS_ALLOWED_ORIGINS`, 백업용 R2 항목 추가
- [x] 7.4 AGENTS.md DB 규칙 — 배포 이후 마이그레이션 동결 명시
- [x] 7.5 design.md에 구현 이탈 반영, `openspec validate add-deployment --strict` 통과
