# kcalog (칼로그)

사진 한 장으로 10초 안에 식사가 기록되는 AI 식단·체중 관리 앱.

기능 범위·요구사항은 `openspec/`(스펙 주도 개발)이 기준이다. 상세 설계 문서·화면 템플릿은 로컬 전용(`docs/`, git 미추적).

## 모노레포 구조

```
kcalog/
├── frontend/   # Vite 8 + React 19 + TypeScript SPA (PWA)
├── backend/    # Spring Boot 4 + JPA + Postgres + Flyway
├── eval/       # 식사 분석 프롬프트 평가 세트 (음식 사진 + 기대값)
└── openspec/   # 스펙 주도 개발 (OpenSpec)
```

## 기술 스택

- **프론트**: Vite + React + TypeScript, react-router, TanStack Query, Tailwind v4, PWA(vite-plugin-pwa)
- **백엔드**: Spring Boot 4, Java 21, JPA, Postgres 16, Flyway, Spring Security + OAuth2(카카오) + JWT
- **AI**: OpenAI Vision(구조화 출력) — 식사 사진 분석. LLM 연동은 provider 교체 가능하게 추상화 예정

## 핵심 기능 (로드맵)

1. 식사 기록 — 사진 촬영 → **비동기 AI 분석**(작업 생성·폴링) → 사진 위 음식별 탄단지 배지 → 탭하여 확인·수정 → 저장 ✅ (사진은 Object Storage 저장, 목록 썸네일)
2. 온보딩·목표 — 카카오 로그인, 프로필 기반 일일 칼로리 목표 자동 계산 ✅
3. 대시보드 — 남은 칼로리·탄단지·타임라인 ✅ / 체중 기록·추이 ✅
4. 학습하는 수정 — 사용자가 고친 값을 개인 보정치로 기억해 다음 인식에 자동 반영 (예정)
5. 적응형 유지칼로리(TDEE) — 체중 추세 + 섭취량으로 역산해 목표 자동 보정 (예정)
6. 주간 리포트·AI PT 코칭 (예정)

## 로컬 실행

```bash
docker compose up -d                 # Postgres 16 (:5432) + MinIO(사진 스토리지, :9000 API / :9001 콘솔)
cd backend && ./gradlew bootRun      # API 서버 :8080
cd frontend && npm run dev           # dev 서버 :5173 (/api → :8080 proxy)
```

- DB·사진 스토리지(MinIO)까지 환경변수 없이 docker-compose 기본값으로 동작한다. 버킷은 최초 저장 시 자동 생성된다.
- **AI 식사 분석**을 쓰려면 OpenAI API 키가 필요하다 — `.env.example`을 `.env`로 복사해 `OPENAI_API_KEY`를 채운다. 키가 없으면 분석 기능만 에러이고 나머지는 정상 동작한다.
- 카카오 로그인 테스트에는 `KAKAO_CLIENT_ID`/`KAKAO_CLIENT_SECRET`이 필요하다 (`.env.example` 참고).
- 운영은 사진 스토리지로 S3/R2를 쓴다 — `STORAGE_*` 환경변수 필수(`application-prod.yml`, `.env.example` 참고).

## 테스트

```bash
cd backend && ./gradlew test         # Docker 데몬만 켜져 있으면 됨 (Testcontainers)
cd frontend && npm test              # vitest
```

## 운영 배포

```
kcalog.site       → Vercel (프론트)
api.kcalog.site   → AWS EC2 (t3.small)
                      └ docker compose: Traefik(자동 HTTPS) + backend + Postgres 16
사진               → Cloudflare R2 (S3 호환, 24시간 보관)
백업               → 매일 pg_dump → R2 (deploy/backup.sh, 14일 보관)
```

**배포는 `release` 브랜치에 들어왔을 때만 일어난다.** main 머지는 배포하지 않는다 — 프론트만 먼저 나가면 아직 없는 API를 부르는 화면이 운영에 뜬다.

```bash
git checkout release && git merge main && git push origin release
```

`.github/workflows/deploy.yml`이 백엔드 이미지를 ghcr.io에 올리고 SSH로 VM에 배포한 뒤 `https://api.kcalog.site/actuator/health`로 기동을 확인한다. 실패하면 워크플로우가 실패한다. 프론트는 Vercel의 Production Branch가 `release`라 Git 연동이 같은 시점에 배포한다.

- **`release` 브랜치 = 지금 운영에 떠 있는 코드.** 이미지는 커밋 SHA로 태깅되고, 배포 커밋은 워크플로우 실행 요약에 남는다.
- **롤백**: 되돌릴 커밋을 `release`에 올린다 (`git revert` 후 push, 또는 이전 커밋으로 되돌려 push).
- **핫픽스를 `release`에 직접 얹었다면 반드시 main으로 역머지한다** — 빼먹으면 다음 릴리스에서 수정이 사라진다.

- 운영 구성 파일은 `deploy/`에 있다 (`compose.prod.yml`, `backup.sh`). 라우팅·인증서는 Traefik이 backend 서비스의 도커 라벨을 읽어 구성하고, `acme.json`은 네임드 볼륨 안에서 Traefik이 직접 만든다(사전 준비 불필요).
- **운영에서 `docker compose down -v` 금지.** 로컬 DB 초기화 습관대로 치면 운영 데이터(`db-data`)와 인증서(`traefik-acme`)가 함께 지워진다.
- 시크릿은 GitHub Secrets에 두고 배포 시 VM의 `.env`로 주입한다 — 항목은 `.env.example` 참고.
- 프론트·백엔드가 다른 출처라 `CORS_ALLOWED_ORIGINS`가 **운영 필수**다. 서브도메인이라 same-site여서 refresh 쿠키(`SameSite=Lax`)는 그대로 동작한다.
- Vercel 프리뷰 배포(`*.vercel.app`)는 도메인이 달라 **로그인이 동작하지 않는다** — 화면 확인용으로만 쓴다.
- **운영 배포 이후 적용된 Flyway 마이그레이션은 수정 금지** (체크섬 불일치로 기동 실패). 항상 새 버전 파일로.

전체 절차와 수동 준비 작업(도메인·DNS·VM·R2·카카오 설정)은 `openspec/changes/add-deployment/tasks.md` 참고.

## 모니터링

```
[앱 서버 t3.small]                    [모니터링 VM t3.micro]
  backend  ─┐                           Loki        로그 30일
  db        ├─ Alloy ── 로그 push ──→    Prometheus  지표 30일
  traefik  ─┘                           Grafana     조회, 알림
  node-exporter ↑                           │
     └────── 지표 pull (8081, 9100) ────────┘
```

감시자는 감시 대상과 함께 죽으면 안 되므로 **서버를 나눈다.** 구성은 `deploy/monitoring/`에 있고, 앱 서버 쪽 Alloy와 node-exporter는 `deploy/compose.prod.yml`에 있어 배포 워크플로가 함께 올린다.

### 보는 방법

Grafana는 인터넷에 열지 않는다. **Tailscale 안에서만** 보인다.

```
http://<모니터링 VM의 Tailscale 주소>:3000
```

평소 보는 화면은 대시보드 `kcalog 운영` 하나다. 위 두 칸(백엔드 상태, 최근 5분 에러)으로 정상 여부를 판단하고, 이상하면 아래로 내려가 좁힌 뒤 오른쪽 아래 로그 패널에서 끝낸다.

한 요청을 따라갈 때는 응답 헤더의 `X-Request-Id`를 쓴다.

```
{app="kcalog"} | json | requestId = "a1b2c3d4e5f6"
```

⚠️ **스택 트레이스가 담긴 줄에는 요청 식별자가 없다.** Tomcat이 필터 바깥에서 찍기 때문이다. 그때는 같은 스레드로 잇는다.

```
{app="kcalog"} | json | process_thread_name = "http-nio-8080-exec-3"
```

### 구성을 고칠 때

- 구성 파일은 **레포가 원본이다.** 급해서 서버에서 직접 고쳤다면 반드시 레포에 반영한다. `release` 역머지 누락과 같은 종류의 위험이고, 빼먹으면 서버를 다시 세울 때 사라진다.
- 대시보드(`deploy/monitoring/dashboards/*.json`)는 **화면에서 저장할 수 없다.** 파일을 고치면 새로고침으로 반영된다. 자유롭게 실험하려면 Grafana에서 새 대시보드를 만들어 쓰고, 쓸 만해지면 내보내 이 폴더에 넣는다.
- 로컬에서 그대로 띄워 확인할 수 있다. 환경마다 다른 값은 전부 `.env`로 빠져 있어 파일은 같다.

```bash
cd deploy/monitoring && docker compose --profile local up -d
```

- 🔴 `loki.yml`의 `compactor.retention_enabled`를 끄지 말 것. 끄면 로그가 영원히 쌓이고, 디스크가 차면 **Loki는 죽는 대신 로그를 못 받는 상태로 조용히 버틴다.**

자세한 결정 근거는 `openspec/changes/add-observability/design.md` 참고.
