# add-observability tasks

👤 = 사람이 콘솔이나 서버에서 직접 해야 하는 것.

PR 하나로 간다. 아래 순서는 리뷰 단위가 아니라 **작업 순서**다.

## 🔴 배포 순서 제약

머지한 뒤 바로 `release`로 내리지 않는다.

```
머지 → 모니터링 VM 생성하고 Loki 기동 → 그다음 release 배포
```

`compose.prod.yml`에 Alloy가 들어 있어 **배포되는 순간 뜬다.** 그때 Loki가 없으면 보낼 곳이 없어 계속 재시도하며 에러 로그를 쌓는다. 모니터링을 붙이려다 로그를 더럽히는 모양이 된다.

배포 직후 `https://api.kcalog.site/actuator/health`를 반드시 확인한다. 관리 포트 이전이 어긋나면 워크플로의 기동 확인이 실패해 배포가 통째로 막힌다 (design.md Risks).

## 백엔드 관측 준비

### 1. 메트릭 노출

- [x] 1.1 `build.gradle.kts`: `micrometer-registry-prometheus` 의존성 추가
- [x] 1.2 `application.yml`: `management.server.port: 8081`, 노출 범위에 `prometheus` 추가
  - actuator **전체**가 8081로 옮겨간다. health만 8080에 남길 수 없다 (D4)
- [x] 1.3 `compose.prod.yml`: Traefik 라우터를 하나 더 두어 `/actuator/health`만 8081로 공개 라우팅
  - `/actuator/prometheus`는 어느 규칙에도 걸리지 않아야 한다
- [x] 1.4 `compose.prod.yml`: 8081을 호스트에 공개. 보안 그룹으로 모니터링 서버만 허용할 것이므로 루프백 제한은 두지 않는다
  - DB(`127.0.0.1:5432`)와 다르다. 다른 VM에서 접근해야 하므로 보안 그룹이 통제 지점이다
- [x] 1.5 🔴 **관리 포트에도 Spring Security가 적용된다**(실측). `/actuator/**`를 permitAll로 열지 않으면 지표 수집이 401로 막힌다
- [x] 1.6 🔴 포트 분리를 `ConfigurationSanityCheck`로 강제. 분리가 깨지면 permitAll이 그대로 공개 도메인에 걸리므로, 운영 기동을 막는다 (구현 이탈)

### 2. 구조화 로깅

- [x] 2.1 `application-prod.yml`: `logging.structured.format.console`로 JSON 출력
  - **운영 프로파일에만.** 로컬은 사람이 읽는 평문 유지 (D5)
- [x] 2.2 로컬 실행에서 로그 형식이 그대로인지 확인
- [x] 2.3 실제 출력으로 필드 위치 확인: 레벨은 `log.level`(중첩), MDC는 최상위 평평한 필드
  - 8.3에서 라벨을 뽑을 때 이 경로를 쓴다

### 3. 요청 ID

- [x] 3.1 요청마다 ID를 생성해 MDC에 넣는 필터. 응답이 끝나면 반드시 제거한다
  - 스레드 풀이 재사용되므로 지우지 않으면 **다음 요청에 남은 ID가 붙는다**
- [x] 3.2 응답 헤더로 ID 내보내기 (D5)
- [x] 3.3 테스트: 응답 헤더에 ID가 있고, 요청마다 다른 값인지
- [x] 3.4 테스트: 처리 후 MDC가 비워지는지 (예외가 나도)
- [x] 3.5 ⚠️ **비동기 전파**: `analysisExecutor`에 `TaskDecorator`를 달아 MDC를 옮긴다
  - 없으면 정작 오래 걸리는 사진 분석 로그에만 식별자가 없다 (구현 이탈)
- [x] 3.6 테스트: 다른 스레드로 전파되고, 실행 후 되돌려지는지

### 4. 백엔드 검증

- [x] 4.1 `./gradlew test` 통과 (265개, 실패 0)
- [x] 4.2 👤 배포 후 `https://api.kcalog.site/actuator/health`가 200 UP인지
  - **배포 워크플로의 기동 확인이 이 경로를 쓴다.** 실패하면 배포 전체가 막힌다 (Risks)
- [x] 4.3 👤 배포 후 `https://api.kcalog.site/actuator/prometheus`가 **외부에서 안 보이는지** (401, 내용 0바이트)
- [x] 4.4 운영 로그가 JSON 한 줄로 나오는지 (126건 전부 JSON)
  - 요청 ID가 붙은 것은 그중 1건뿐이다. 운영은 INFO라 요청 처리 중 남기는 로그가 드물다 (`docker logs kcalog-backend | tail -1 | jq .`)
- [x] 4.5 예외 로그의 스택 트레이스가 **한 건 안에** 담기는지 (로컬에서 확인: 26줄이 error.stack_trace 한 필드에)
  - ⚠️ 그 줄에는 requestId가 없다. Tomcat이 필터 바깥에서 찍기 때문이다. 스레드 이름으로 잇는다 (design 구현 이탈)

## 모니터링 VM

### 5. 인프라 준비 (👤)

- [x] 5.1 👤 t3.micro 생성: 앱 서버와 **같은 리전, VPC, AZ**, 20GB gp3 (D1, D8)
  - 같은 AZ가 아니면 데이터 전송 요금이 붙는다
  - t4g(ARM)로 계획했으나 프리 티어에 해당하지 않아 t3(x86)로 바꿨다. 설정 파일은 그대로다
- [x] 5.2 👤 스왑 설정: 1GB에 750MB를 쓰므로 순간 초과를 흡수할 안전판 (D2)
- [x] 5.3 👤 보안 그룹: **IP가 아니라 상대 보안 그룹 ID로 참조** (인스턴스 재시작 시 사설 IP가 바뀐다)
  - 모니터링 → 운영 8081 (메트릭 수집)
  - 운영 → 모니터링 3100 (로그 전송)
- [x] 5.4 👤 도커와 compose 설치
- [x] 5.5 👤 Tailscale 설치: VM, 맥, 아이폰 (D9). VM은 `100.67.54.77`
- [x] 5.6 👤 SSH 인증 방식 확인: `sudo sshd -T | grep -E "^(passwordauthentication|permitrootlogin)"`
  - `no`와 `prohibit-password`가 아니면 고친다. 22번이 인터넷에 열려 있어 이것이 유일한 방어선이다

### 6. 구성 파일 (레포)

- [x] 6.1 `deploy/monitoring/compose.yml`: Loki, Prometheus, Grafana
  - Grafana는 Tailscale 주소에서만 접근한다. 공개 포트를 열지 않는다
- [x] 6.2 🔴 Loki 설정: **compactor와 retention 30일을 명시적으로 켠다**
  - 기본값은 "안 지움"이다. 놓치면 디스크가 차고, Loki는 죽는 대신 **로그를 못 받는 상태로 조용히 버틴다** (D8)
- [x] 6.3 Prometheus 설정: 운영 VM 8081 스크레이프, 보관 30일
  - 대상 주소는 compose의 `extra_hosts`로 갈린다. prometheus.yml은 로컬과 운영에서 같다 (D12)
- [x] 6.4 Grafana 데이터소스 프로비저닝 (Loki, Prometheus)
- [x] 6.5 👤 Grafana 기본 관리자 비밀번호 변경, 가입 비활성화
  - 네트워크가 막혀 있어도 계정은 계정이다 (D9)
- [x] 6.6 node exporter를 두 서버에 (D13). micrometer는 JVM 안만 봐서 디스크와 서버 메모리를 못 본다
  - 쓸 일 없는 수집기를 끄고 도커 overlay 마운트를 제외해 두 서버 합쳐 610 시계열
- [x] 6.7 대시보드 `dashboards/kcalog-ops.json` + 프로비저닝. 패널 11개
  - 화면에서 손으로 만들면 그 VM에만 남는다. 대신 프로비저닝된 것은 화면에서 수정할 수 없다

### 6-1. 로컬 검증 (D12)

VM을 만들기 전에 맥에서 전부 확인했다. `docker compose --profile local up -d`로 띄우고, 백엔드는 운영과 같은 이미지를 컨테이너로 돌렸다.

- [x] 6-1.1 Prometheus가 백엔드를 긁는다 (`up=1`, 지표 148종)
- [x] 6-1.2 백엔드를 멈추면 **`up=0`이 기록된다** (D3에서 pull을 고른 근거가 실제로 성립)
- [x] 6-1.3 Loki에 로그가 들어오고 `container`, `app` 라벨이 붙는다
- [x] 6-1.4 `{app="kcalog", level="ERROR"}`처럼 **레벨로 걸러진다** (라벨 승격 확인)
- [x] 6-1.5 `| json | requestId = "..."`로 한 요청의 로그만 묶여 나온다
- [x] 6-1.6 스택 트레이스가 한 건에 담긴다. 단 그 줄에는 requestId가 없어 스레드 이름으로 잇는다
- [x] 6-1.7 대시보드 11개 패널의 쿼리가 모두 데이터를 낸다 (부하를 만들어 확인)
  - ⚠️ 로컬은 인증 없는 요청뿐이라 `uri`가 UNKNOWN 하나로 뭉친다. 운영에서는 엔드포인트별로 갈린다
- [x] 6-1.8 node exporter 두 대상이 `up`, 디스크 사용률 쿼리가 값을 낸다 (알림 9.2가 쓸 쿼리)

### 7. 지표 검증

- [x] 7.1 👤 Tailscale 주소로 Grafana가 열리는지: 맥과 **아이폰 둘 다**
- [x] 7.2 👤 인터넷에서 모니터링 VM의 3000, 3100, 9090이 **닫혀 있는지** 확인. 셋 다 닫힘, 22만 열림
  - ⚠️ IMDSv2라 퍼블릭 IP 조회에 토큰이 필요하다. 토큰 없이 부르면 빈 값이 와서 **전부 닫힌 것처럼 보인다**
- [x] 7.3 👤 Prometheus 대상 목록에서 백엔드가 `UP`인지 (대상 4개 전부)
- [x] 7.4 👤 Grafana에서 JVM 힙 그래프가 그려지는지
- [x] 7.5 👤 백엔드를 잠시 멈춰 `up=0`이 기록되는지 (D3의 핵심 근거)

## 로그 수집과 알림

### 8. 로그 수집

- [x] 8.1 `compose.prod.yml`에 Alloy 서비스 추가. 워크플로가 `alloy.alloy`를 함께 보내고 `LOKI_URL`을 주입한다
  - 👤 GitHub Secrets에 `LOKI_URL` 등록 필요 (모니터링 VM 사설 IP)
- [x] 8.2 Alloy 설정: 도커 컨테이너 로그를 읽어 Loki로 전송
  - ⚠️ kcalog 컨테이너만 읽도록 걸렀다. 안 그러면 로컬의 남의 컨테이너에도 app 라벨이 붙는다
- [x] 8.3 ⚠️ JSON을 파싱해 **`level`을 라벨로 승격**. 경로는 중첩된 `log.level`이다 (로컬에서 INFO/WARN 확인)
- [x] 8.4 라벨은 `app`, `container`, `level`까지만. 요청 ID나 사용자를 라벨에 넣지 않는다 (D6)

### 9. 알림

- [x] 9.1 👤 슬랙 Incoming Webhook 생성 (api.slack.com/apps에서 앱 생성 후 채널 선택)
- [x] 9.2 `grafana-alerting.yml`: contact point(슬랙 Incoming Webhook), 알림 정책, 규칙 2개
  - `up=0` 2분 지속: 백엔드가 응답하지 못함. 배포 중 수 초 끊김에는 울리지 않는다
  - 디스크 85퍼센트 초과 10분 지속: 차서 로그를 잃기 전에 (D13)
  - 로컬에서 백엔드를 멈춰 `inactive → pending → firing` 전이와 해제까지 확인했다
  - ⚠️ 웹훅이 비면 Grafana가 **기동을 거부한다.** 알림 하나 때문에 로그와 지표를 못 보는 것은
    과해서 placeholder를 기본값으로 뒀다. 대가는 `.env`를 빠뜨리면 알림이 조용히 안 가는 것이고,
    외부 업타임(9.3)과 10.4의 실물 확인이 이를 막는다

### 10. 검증과 문서

- [x] 10.1 👤 Grafana에서 `{app="kcalog", level="ERROR"}`로 에러만 걸리는지
- [x] 10.2 👤 예외 로그를 열었을 때 **스택 트레이스가 통째로** 보이는지 (D5의 목적)
- [x] 10.3 요청 ID가 응답 헤더와 운영 로그 양쪽에 붙는 것을 확인
- [x] 10.4 👤 백엔드를 잠시 멈춰 **슬랙으로 알림이 실제로 오는지**
  - 알림은 만들었다고 되는 게 아니라 와야 된 것이다
- [x] 10.6 README: 모니터링 구성, Tailscale 접근 방법, **레포와 서버가 어긋나지 않게 하는 규칙** (D11)
- [x] 10.7 `openspec validate add-observability --strict` 통과

## 다음 change로 미룬 것

- 🔴 **외부 감시와 데드맨 스위치**(9.3, 9.4, 10.5). Grafana가 알림을 보내는데 **Grafana 자신이 죽으면 알릴 사람이 없다.** 그러면 "알림이 안 오는 것"과 "아무 일 없는 것"이 구분되지 않는다(D10이 막으려던 것). 계정을 하나 더 만들어야 해서 미뤘다. Healthchecks.io 같은 곳에 heartbeat를 만들고 백업 cron 옆에 한 줄 넣으면 된다
- SSH 22번 닫기(5.7). Tailscale로 접속되는 것은 확인했으나 규칙은 남겨뒀다. 닫으면 인터넷에서 열린 포트가 0이 된다

- 백엔드 헬스체크와 컨테이너 메모리 제한: 힙 사용량 그래프를 2주 보고 근거를 갖고 정한다
  - 지금 JVM 최대 힙이 약 1.3GB다(컨테이너 제한이 없어 `MaxRAMPercentage=70`이 VM 전체 기준으로 계산됨)
- 에러 급증 알림: 평소 에러 건수를 모르는 상태에서 임계값을 잡으면 오탐이 쏟아진다
- 분산 추적(traceId): 단일 서비스라 요청 ID로 충분한지 지켜본다
