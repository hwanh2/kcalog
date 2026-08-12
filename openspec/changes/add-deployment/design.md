# Design: add-deployment

## Context

지금까지 운영을 전제한 코드는 `application-prod.yml`(시크릿 fail-closed)과 S3 호환 스토리지 추상화뿐이다. Dockerfile·CD 워크플로우·헬스체크·CORS가 모두 없고, 로컬은 Vite dev 프록시로 프론트와 백엔드를 같은 출처로 묶어 쓰고 있어 **출처가 갈리는 상황을 코드가 한 번도 겪지 않았다**.

결정은 사용자 그릴링(2026-08-12) 확정. 서비스명 kcalog·도메인 `kcalog.site` 확정, 완전 공개, 프론트 Vercel / 백엔드 VM 분리, DB는 관리형 대신 VM 내 컨테이너. 클라우드는 구현 중 GCP → AWS로 바뀌었다(D2).

## Decisions

### D1. 토폴로지 — 서브도메인으로 same-site를 유지한다

```
kcalog.site       → Vercel        (프론트, SPA)
api.kcalog.site   → AWS EC2 t3.small
                      └ docker compose: Traefik(자동 HTTPS) → backend ← postgres:16
사진               → Cloudflare R2 (S3 호환, 보관 24h)
```

**도메인 구매가 선택이 아니라 인증의 전제 조건이다.** refresh 토큰은 쿠키에 있고 `SameSite=Lax`다(`RefreshCookie`).

- `*.vercel.app` ↔ 클라우드가 주는 기본 주소는 서로 **다른 사이트** → Lax 쿠키가 전송되지 않는다. `SameSite=None; Secure`로 바꾸면 서드파티 쿠키가 되고, Safari는 이를 기본 차단한다. 모바일 PWA를 지향하는 앱에서 iOS 로그인 유지가 깨진다.
- `kcalog.site` ↔ `api.kcalog.site`는 eTLD+1이 같아 **same-site**다 → 현재 `SameSite=Lax` 코드를 그대로 두고도 쿠키가 전송된다. 쿠키 관련 코드는 손대지 않는다.

출처는 다르므로(cross-origin, same-site) CORS는 필요하다 — D6.

### D2. 백엔드 런타임 — VM(AWS EC2) + docker compose

"DB를 관리형 대신 서버에 컨테이너로" 결정이 런타임을 강제한다. **서버리스 컨테이너 런타임(Cloud Run·App Runner·Fargate)은 영속 디스크가 없어 Postgres 컨테이너를 띄울 수 없다.** 따라서 VM이다 — 이 판단은 클라우드가 바뀌어도 같다.

- **AWS EC2 `t3.small` (2 vCPU / RAM 2GB)** 선택. 프리티어 `t3.micro`(1GB)는 JVM + Postgres + Traefik 세 프로세스를 함께 올리기에 빠듯해 힙 튜닝·스왑에 시간을 쓰게 되고, 완전 공개 상태에서 OOM 재기동 위험을 안는다. 월 $15 수준을 그 비용으로 본다.
- **x86(`t3`)을 쓴다.** `t4g`(Graviton/ARM)가 더 싸지만 GitHub Actions 러너가 x86_64라 amd64 이미지가 만들어져 ARM 인스턴스에서 실행되지 않는다. 멀티플랫폼 빌드를 넣으면 QEMU 에뮬레이션으로 Gradle 빌드가 몇 배 느려져, 절감액보다 배포 대기 시간의 대가가 크다고 봤다.
- **클라우드는 GCP에서 AWS로 바뀌었지만 배포 코드는 그대로다.** SSH 기반 배포를 고른 덕분에 워크플로우·compose·Dockerfile 중 어느 것도 클라우드에 묶여 있지 않다. 바뀐 것은 인스턴스 타입·Elastic IP·보안 그룹·예산 알림 같은 콘솔 작업뿐이다.
- 리버스 프록시는 **Traefik**(v3) — Let's Encrypt 인증서를 자동 발급·갱신하므로 nginx + certbot 조합의 갱신 크론·reload 훅이 필요 없다. Caddy도 같은 일을 하고 이 고정 구성에는 설정이 더 짧지만, **사용자가 이미 다뤄본 도구를 택했다**(운영 중 장애 대응 속도가 설정 길이보다 중요하다).
- 라우팅은 backend 서비스의 **도커 라벨**에 붙인다. `exposedbydefault=false`로 두어 라벨을 명시한 서비스만 노출되게 한다 — Postgres가 실수로 외부에 열리는 것을 구조적으로 막는다.
- 백엔드 컨테이너는 포트를 호스트에 직접 노출하지 않고 compose 내부 네트워크로만 Traefik에 연결한다. Postgres도 마찬가지로 외부 미노출.
- 평문(:80) 접속은 엔트리포인트 리다이렉션으로 전부 HTTPS로 돌린다.

### D3. 배포 파이프라인 — release 브랜치, ghcr, SSH

```
git checkout release && git merge main && git push origin release
   → GitHub Actions
       ├ 백엔드: 이미지 빌드 → ghcr.io push → SSH로 VM 접속 → .env 갱신 → pull → up -d
       └ 프론트: Vercel 운영 배포 (main 자동배포는 프리뷰 전용)
```

- **release 브랜치 트리거**로 프론트·백엔드를 묶는다. main 머지마다 프론트만 배포되면 아직 없는 API를 부르는 화면이 운영에 뜬다.
- **버전 태그 대신 브랜치를 고른 이유**: 그릴링 초안은 태그(`v*`)였으나, 사용자가 실무에서 쓰이는 릴리스 브랜치 방식을 직접 겪어보는 쪽을 택했다(학습 목적). 브랜치 보호 규칙으로 "release로 가는 건 CI 통과 필수"를 GitHub이 강제할 수 있고, 배포가 머지라는 익숙한 동작이 된다는 이점도 있다.
- **대가**: 사람이 부를 수 있는 버전 번호(`v1.0.2`)가 사라져 "운영에 뭐가 떠 있나"의 답이 커밋 SHA가 된다. 이를 보완하려고 이미지를 커밋 SHA로 태깅하고, 배포 워크플로우가 실행 요약에 배포 커밋을 남긴다. 롤백은 되돌릴 커밋을 release에 올리는 방식이 된다.
- 이미지는 **ghcr.io** — GitHub Actions가 실행마다 자동 발급되는 `GITHUB_TOKEN`으로 push할 수 있어, Docker Hub와 달리 장기 유효한 토큰을 별도로 만들어 보관할 필요가 없다.
- **패키지는 private 유지.** 레포가 public이고 이미지에 시크릿이 없어(전부 런타임 주입) 공개해도 새는 정보는 없지만, 굳이 열 이유도 없다는 판단. 대신 VM이 pull하려면 자격증명이 필요해 `read:packages` 스코프만 가진 PAT를 쓴다 — VM의 `~/.docker/config.json`에 남는 값이므로, 유출되어도 이미지 읽기 외에는 할 수 없게 스코프를 최소로 묶는다.
- VM에서 이미지를 직접 빌드하지 않는다. t3.small에서 Gradle 빌드는 메모리 부담이 커 같은 서버의 DB를 위협하고, 이전 버전 이미지가 남지 않아 롤백 수단이 사라진다.
- **SSH 키** 방식을 쓴다. Workload Identity Federation이 보안상 우위지만 IAM·풀 설정 비용이 개인 프로젝트 규모에 비해 크다. 대신 배포 전용 계정 + 명령 제한으로 피해 범위를 줄인다(Risks 참고).
- 컨테이너 교체 중 **수 초 단절을 감수**한다. 무중단은 인스턴스 2개 + 헬스체크 기반 전환이 필요해 단일 VM 전제와 맞지 않는다.

### D4. 시크릿 — GitHub Secrets에서 주입

배포 시 액션이 GitHub Secrets로 `.env`를 만들어 VM에 전달하고, compose가 그것을 읽는다.

- 값 교체가 웹에서 끝나고 변경 이력이 남는다. VM에 직접 들어가 파일을 고치는 것보다 재현성이 높다.
- 대가로 **모든 시크릿이 매 배포마다 CI를 경유**한다. 워크플로우 로그에 값이 찍히지 않도록 `.env`는 파일로만 만들고 echo 하지 않으며, 액션 권한을 최소로 유지한다.
- VM의 `.env`는 소유자 전용 권한(0600)으로 둔다.

### D5. 스토리지·백업 — 둘 다 R2

- 사진은 **Cloudflare R2**. S3 호환이라 `STORAGE_*` 환경변수만 바꾸면 코드 변경이 없고, 무료 티어와 송신 비용 0이 보관 24시간짜리 워크로드에 맞는다. VM 디스크와 사진의 수명을 분리해 서버가 날아가도 영향이 없다.
- **DB 백업**: 매일 `pg_dump` → R2 업로드, 보관 기간(기본 14일) 지난 것은 삭제. 관리형을 쓰지 않기로 해 자동 백업이 없고, 이 구성에서 **VM 디스크 하나가 곧 데이터 전부**다. 사진 때문에 이미 R2를 쓰므로 추가 가입이 없다.
- 백업은 cron(호스트) → compose exec `pg_dump` → R2 업로드 스크립트로 단순화한다.

### D6. 코드 변경 최소 집합

분리 배포가 아니었다면 필요 없었을, **지금 코드로는 운영에서 깨지는 것**들만 고친다.

| 변경 | 없으면 생기는 일 |
|---|---|
| CORS 설정 (`kcalog.site` 허용, `allowCredentials`) | 브라우저가 모든 API 응답을 차단 — 앱 전체가 동작 불가 |
| `server.forward-headers-strategy: framework` | Traefik 뒤에서 `redirect-uri: {baseUrl}`이 `http://`로 생성 → 카카오 로그인 실패 |
| actuator 추가 + `/actuator/health` permitAll | `anyRequest().authenticated()`라 헬스체크가 401 → 배포 성공 판정 불가 |
| `vercel.json` SPA 폴백 | `/weight` 직접 진입·새로고침 시 404 (react-router) |
| Dockerfile | 배포 가능한 산출물 자체가 없음 |

- **허용 출처는 환경변수로 주입**한다(`app.cors.allowed-origins`). 로컬은 Vite 프록시라 목록이 비어도 되고, 운영은 `https://kcalog.site` 하나다. 와일드카드는 쓰지 않는다 — `allowCredentials`와 함께 쓸 수 없고, 쓸 수 있더라도 공개 서비스에서 쿠키를 아무 출처에나 열어주게 된다.
- actuator는 **`health`만 노출**한다. `env`·`configprops` 등이 열리면 시크릿이 노출된다.
- 헬스체크는 DB 연결 상태를 포함하되, 상세 내역은 공개하지 않는다(`show-details: never`) — 인증 없이 열려 있어 내부 구성이 새면 안 된다.

### D7. 관측 — 헬스체크 + 로그로 시작

- 배포 워크플로우가 공개 주소의 `/actuator/health`로 기동을 판정하고, compose 재시작 정책으로 죽은 컨테이너를 되살린다.
- docker 로그는 **용량 제한(`max-size`/`max-file`)을 반드시 건다.** 제한이 없으면 로그가 디스크를 채워 DB까지 같이 멈춘다 — 단일 VM 구성에서 가장 흔한 장애 원인이다.
- 에러 추적(Sentry)·외부 가동 감시는 이번 스코프 밖. 문제가 나면 SSH로 로그를 본다.

### D8. 서비스명 kcalog 확정

도메인 `kcalog.site`를 사는 시점에 이름이 사실상 확정된다. 패키지(`com.kcalog`)·레포명·PWA manifest가 이미 kcalog라 **변경할 코드가 없다.** AGENTS.md·README의 "서비스명 미정 — 확정 시 일괄 변경" 문구만 정리한다.

## Risks / Trade-offs

- **[Traefik에 도커 소켓을 마운트]** 라벨을 읽으려면 `/var/run/docker.sock`이 필요한데, 도커 소켓 접근은 사실상 호스트 root 권한과 같다. Traefik이 뚫리면 VM 전체가 넘어간다. 읽기 전용(`:ro`)으로 제한하지만 완전한 방어는 아니다 — 완전히 막으려면 소켓 프록시를 한 단 더 두어야 하고, 개인 프로젝트 규모에서는 과하다고 보고 감수한다. (Caddy는 소켓이 필요 없어 이 위험이 없다 — 도구 선택의 대가다.)
- **[단일 VM = 단일 장애점]** VM이 죽으면 서비스 전체가 멈춘다. 개인 프로젝트 규모에서 이중화 비용이 이득보다 크다고 보고 감수한다. 데이터 손실만 백업으로 막는다.
- **[LLM 비용에 천장이 없음]** 완전 공개인데 방어가 1인당 일일 상한(분석 20·채팅 30)뿐이라, 가입자 수에 비례해 비용이 늘고 상한이 없다. 유일한 천장인 OpenAI 월 한도는 걸리는 순간 **모든 사용자의 분석이 동시에 실패**하는 방식으로 걸린다. 기록·조회 기능은 살아 있고 되돌리기 쉬워, 실사용 규모를 본 뒤 서비스 전체 상한을 다음 change로 다루기로 했다. AWS Budgets 알림과 OpenAI 월 한도는 이번에 반드시 설정한다.
- **[SSH 키가 GitHub에 상주]** 유출되면 서버가 통째로 넘어간다. 배포 전용 사용자 + 최소 권한으로 피해를 줄이고, 키는 이 용도로만 발급한다. 호스트 키는 `SSH_KNOWN_HOSTS`로 고정한다 — 매 배포마다 `ssh-keyscan`으로 받으면 위조 호스트가 `.env`(시크릿 전량)를 수신할 수 있다.
- **[SSH 포트가 인터넷에 열려 있음]** 러너 IP를 특정할 수 없어 소스를 제한하지 못한다(GitHub이 공개하는 대역은 수천 개 CIDR이고 수시로 바뀌어 보안 그룹 규칙 한도를 넘는다). 비밀번호 로그인 비활성(Ubuntu 기본값) + 키 인증만으로 방어하고, 자동화된 로그인 시도는 실패 로그로 흘린다. 더 조이려면 SSM Session Manager로 바꿔 인바운드를 완전히 닫거나, 배포 시작 시 러너 IP를 규칙에 넣었다 빼는 방식이 있으나 둘 다 AWS 자격증명을 Actions에 연결해야 해 "SSH를 고른 이유(단순함)"를 되돌린다. 실사용을 본 뒤 판단한다.
- **[시크릿이 매 배포마다 CI 경유]** D4의 대가. 로그 노출 방지와 액션 권한 최소화로 완화한다.
- **[Vercel 프리뷰에서 로그인 불가]** 프리뷰는 `*.vercel.app`이라 쿠키가 가지 않는다. 프리뷰마다 카카오 리다이렉트 URI를 등록하는 비용이 이득보다 커서, **프리뷰는 화면 확인용으로만** 쓰고 인증 검증은 운영에서 한다.
- **[배포 중 단절]** 컨테이너 교체 동안 수 초 502. 릴리스 배포라 빈도가 낮아 감수한다.
- **[release → main 역머지 누락]** release 브랜치에 핫픽스를 직접 얹으면 그 커밋을 main으로 되돌려 머지해야 한다. 빼먹으면 다음 릴리스에서 수정이 사라진다 — 브랜치 방식을 고른 대가이고, 규칙으로 관리한다(핫픽스도 가급적 main을 거쳐 release로 내린다).
- **[마이그레이션 동결]** 첫 배포 이후 V1~V17은 수정 불가가 된다. 지금까지는 미배포라 자유롭게 고쳤지만, 배포 순간부터 AGENTS.md의 "머지된 뒤에는 새 버전으로만" 규칙이 실제로 발효한다.
- **[t3.small 메모리]** 2GB에 JVM·Postgres·Traefik이 함께 산다. 여유는 있지만 무한하지 않아, 첫 배포 후 실사용 메모리를 확인한다.

## Migration Plan

- DB 스키마 변경 없음. 첫 배포 시 빈 DB에 Flyway가 V1~V17을 순서대로 적용한다.
- 백엔드 인스턴스가 하나라 마이그레이션 동시 실행 문제가 없다. 기동 시 자동 적용으로 둔다.
- 로컬 개발 경로는 그대로다 — `docker compose up -d` + `bootRun` + `npm run dev`. 운영 compose는 `deploy/`에 따로 두어 로컬 파일을 오염시키지 않는다.

## 구현 이탈 (design 대비)

- **클라우드를 GCP → AWS로 변경**: 구현 후 사용자가 이미 쓰는 계정에 맞췄다. **코드는 한 줄도 바뀌지 않았다** — SSH 기반 배포라 워크플로우·compose·Dockerfile 어디에도 클라우드 종속이 없었고, 인스턴스 타입(`e2-small` → `t3.small`)·Elastic IP·보안 그룹·예산 알림 같은 문서 표기만 고쳤다. 초기에 Workload Identity Federation 대신 SSH를 고른 선택이 여기서 값을 했다.
- **배포 트리거를 태그 → `release` 브랜치로 변경**: 그릴링에서 태그로 확정했으나 구현 중 사용자가 릴리스 브랜치 방식으로 바꿨다(D3에 근거·대가 기록). 이미지 태그가 버전 번호에서 커밋 SHA로 바뀌었다.
- **CI를 `release` 브랜치에서도 실행**: 브랜치 보호 규칙(0.10)이 "CI 통과"를 요구하려면 그 브랜치에서 검사가 돌아야 한다. `ci.yml`의 push 대상에 `release`를 추가했다.
- **`index.html` 정리**: 제목이 `frontend`, `lang="en"`이었다. 운영 도메인에 그대로 나가면 브라우저 탭에 "frontend"가 뜨고 한국어 페이지가 영어로 선언된다. 배포로 드러나는 결함이라 함께 고쳤다(제목·언어·description·theme-color).
- **PWA 아이콘 미해결**: manifest에 아이콘이 아예 없어 안드로이드 설치 배너가 뜨지 않는다. `favicon.svg`를 등록해 두되, 192/512 png는 이미지 자산이 필요해 tasks 4.4로 남긴다.
- **배포 커밋 기록 스텝 추가**: `release`는 계속 움직여 "무엇이 배포됐나"가 브랜치 이름만으로는 안 남는다. 워크플로우 실행 요약에 커밋 SHA·메시지를 기록한다. 커밋 메시지는 셸에 보간하지 않고 환경변수로 넘긴다(메시지 내용이 명령으로 실행되는 것을 막는다).
- **ghcr 토큰을 stdin으로 전달**: 명령줄에 실으면 VM 프로세스 목록에 노출되므로 `docker login --password-stdin`으로 넘긴다.
- **JWT 서명 키 길이 검증 추가 (보안 결함 수정)**: 로컬 이미지 검증 중에 `JWT_SECRET` 없이도 앱이 정상 기동하는 것을 발견했다. `JwtConfig`가 쓰는 `SecretKeySpec`이 키 길이를 검사하지 않아, 변수를 빠뜨리고 배포하면 **사실상 위조 가능한 서명 키로 서비스가 뜨고 헬스체크까지 통과**한다. `AppProperties.Jwt.secret`에 `@NotBlank` + `@Size(min = 32)`를 걸어 기동을 실패시킨다.
- **미해석 플레이스홀더 감지 (`ConfigurationSanityCheck`)**: 위 결함의 원인을 파다가, `@ConfigurationProperties` 바인딩이 해석되지 않은 `${VAR}`를 오류로 보지 않고 **문자열 그대로 값에 넣는다**는 것을 확인했다(`Value: "${JWT_SECRET}"`). 즉 `application-prod.yml`의 "미주입 시 기동 실패" 주석은 사실이 아니었고, `DB_URL`만 우연히(`'url' must start with "jdbc"`) 걸리고 있었다. 스토리지·OpenAI·CORS 키를 빠뜨리면 앱이 뜨고 배포는 성공으로 끝난 뒤 사용자 요청에서야 실패한다. 웹 서버가 요청을 받기 전(`@PostConstruct`)에 남은 플레이스홀더를 찾아 기동을 중단시킨다.
- **리버스 프록시를 Caddy → Traefik으로 변경**: 구현 중 사용자가 이미 다뤄본 도구로 바꿨다. 인증서 자동 발급이라는 결과는 같고, 설정이 파일 대신 **도커 라벨**로 옮겨갔다. 대가로 도커 소켓 마운트가 필요해졌다(Risks 참고). `deploy/Caddyfile`은 삭제하고 라우팅을 compose에 흡수해 scp 대상도 하나 줄었다.
- **SSE에 별도 버퍼링 설정을 넣지 않음**: Traefik(Go의 리버스 프록시)은 `text/event-stream` 응답을 감지해 즉시 flush하는 것이 기본 동작이라, 확신 없는 `flushInterval` 값을 넣어 기동을 위태롭게 하는 대신 기본값에 맡겼다. 대신 첫 배포 검증(6.6)에서 실제 스트리밍을 눈으로 확인한다.
- **이미지 정리 방식 변경**: `docker image prune -f`는 태그 없는 이미지만 지우는데, 배포마다 받는 이미지에는 커밋 SHA 태그가 붙어 있어 지워지지 않고 회당 약 800MB씩 쌓인다. 디스크가 차면 DB까지 멈추는 구성이라 `-af --filter until=168h`로 바꿨다(7일치는 롤백용으로 남긴다).

## 리뷰 대응 (PR #35)

- **🔴 fail-closed가 '빈 값'을 못 잡았다**: 배포 워크플로우는 시크릿을 무조건 `KEY=값`으로 `.env`에 쓰므로, 등록하지 않은 GitHub Secret은 '정의 안 됨'이 아니라 **빈 문자열**로 도착한다. `ConfigurationSanityCheck`는 미해석 `${...}`만 봐서 그대로 통과했다. 재현 결과 `CORS_ALLOWED_ORIGINS`·`OPENAI_API_KEY`가 빈 값이면 **앱이 기동하고 `/actuator/health`가 UP을 반환해 배포가 성공으로 끝나는데, 프론트 출처의 preflight는 403**이었다 — 이 장치가 막으려던 바로 그 상태다. 검사를 **운영 프로파일에서 빈 값도 거부**하도록 확장했다(로컬은 `app.cors.allowed-origins`가 의도적으로 비어 있어 프로파일로 갈랐다). 목록이 통째로 비는 경우는 원소 순회가 한 번도 돌지 않으므로 따로 본다.
  - **검증이 틀린 시나리오를 확인했었다.** 로컬 검증에서 환경변수를 *생략*해 테스트했는데(→ `${VAR}` 리터럴), 실제 파이프라인은 *빈 값*을 넣는다. 빈 값 경로를 회귀 테스트로 고정했다.
- **🔴 카카오 자격증명이 fail-closed 밖에 있었다**: `application-prod.yml`에 override가 없어 운영에서도 `application.yml`의 `${KAKAO_CLIENT_ID:kakao-client-id-placeholder}` 기본값이 유효했다. 빠뜨리면 placeholder OAuth 클라이언트로 기동에 성공하고 **앱의 유일한 인증만 조용히 깨진다**. 기본값 없는 override를 추가하고 sanity check 대상에도 포함했다(`app.*` 밖이라 `Environment`에서 따로 읽는다). 빈 값은 스프링 자체 검증이 우연히 잡아주고 있었지만, `DB_URL`이 `'url' must start with "jdbc"`로 걸리던 것과 같은 우연한 방어라 명시적으로 바꿨다.
- **SSH 호스트 키 고정(nit)**: `ssh-keyscan`은 러너가 매번 새로 떠 사실상 매 배포가 TOFU였고, 그 채널로 `.env` 전량이 나간다. `SSH_KNOWN_HOSTS` 시크릿 필수로 바꿨다(없으면 안내 메시지와 함께 실패).
- **Vercel 토큰을 env로(nit)**: 이 스텝만 `--token=`으로 커맨드라인에 실어 프로세스 목록에 노출됐다. 다른 스텝과 동일하게 환경변수로 받는다.
- **`backup.sh`의 `.env` 소싱 제거(nit)**: `set -a; . ./.env`는 값 안의 `$`·백틱을 평가한다. `.env`는 compose의 리터럴 파서용이라 해석이 어긋난다. 필요한 키만 읽는 `read_env()`로 바꿨다(특수문자가 리터럴로 읽히는 것을 확인).
- **낡은 주석 정정(nit)**: `Dockerfile`의 "e2-small에 Caddy" → "t3.small에 Traefik", `vite.config.ts` TODO의 `tasks 4.3` → `4.4`.
- **검증 경로 이원화(참고)**: `AppProperties`의 애노테이션과 `ConfigurationSanityCheck`의 목록이 갈려 있다. 역할이 다르다고 보고 유지한다 — 애노테이션은 **값의 형태**(JWT 키 32바이트 이상)를 모든 환경에서 강제하고, sanity check는 **운영에서의 존재 여부**를 본다. 후자는 프로파일 조건이 붙어 애노테이션으로 표현할 수 없다.

## Open Questions (구현으로 확정)

- 백업 보관 기간 → 14일. 사고 인지에 넉넉하면서 R2 무료 티어를 위협하지 않는 값.
- 이미지 태그 규칙 → 커밋 SHA와 `latest` 둘 다 붙인다. VM은 SHA로 고정 배포해 재현 가능하게 하고, `latest`는 조회 편의용.
- 헬스체크 경로를 외부에 노출할지 → 노출한다. 외부 가동 감시를 나중에 붙일 때 필요하고, `show-details: never`라 새는 정보가 없다.
