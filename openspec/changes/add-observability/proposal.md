# add-observability

## Why

운영에 나간 뒤로 서비스가 어떤 상태인지 알 방법이 없다. 장애가 나면 사용자가 말해주거나 직접 앱을 열어봐야 알고, 원인을 찾으려면 SSH로 들어가 `docker logs`를 눈으로 훑어야 한다. 검색이 안 되고, 컨테이너당 30MB를 넘긴 로그는 이미 사라진 뒤다.

특히 조용한 구멍이 셋 있다.

- 인지 수단이 없다. 새벽에 죽으면 아침까지 모른다.
- 자바 스택 트레이스가 흩어진다. 평문 로그라 예외 하나가 30여 줄로 나뉘고, 동시 요청의 로그와 섞여 이어 붙이기 어렵다.
- 요청을 묶을 수단이 없다. MDC도 요청 ID도 없어서 "이 사용자의 이 요청이 왜 실패했나"를 시간대로 짐작해야 한다.

이 change는 장애 대응의 인지와 원인 파악까지를 다룬다. 재발 방지(백엔드 헬스체크, 컨테이너 메모리 제한)는 메트릭을 쌓아 근거를 확보한 뒤 별도로 다룬다. 지금 정하면 짐작으로 값을 잡게 된다.

## What Changes

- **모니터링 전용 VM 분리.** 앱 서버(t3.small)와 같은 리전, VPC, AZ에 t3.micro(1GB, 20GB)를 둔다. 감시자가 감시 대상과 함께 죽으면 안 되고, 앱 서버는 이미 여유가 크지 않다.
- **메트릭 노출.** `micrometer-registry-prometheus`를 추가하고 actuator 전체를 관리 포트 8081로 분리해 Traefik 라우팅에서 뺀다. `/actuator/health`만 공개 경로로 남긴다. 지금 구성대로 `prometheus`를 열면 힙, 커넥션 풀, 엔드포인트별 호출량이 인터넷에 공개된다.
- **구조화 로깅.** 운영 프로파일에서 JSON으로 찍는다. 스택 트레이스가 한 필드에 담겨 수집기가 쪼개지 않는다.
- **요청 ID.** 요청마다 ID를 만들어 MDC에 넣고 응답 헤더로 내보낸다. 한 요청의 로그를 묶어 보고, 사용자가 알려준 ID로 곧장 찾는다.
- **로그 수집.** 앱 서버에 Grafana Alloy를 두고 Loki로 보낸다. 라벨은 `app`, `container`, `level`까지만 둔다.
- **알림.** 외부 업타임 서비스가 서비스와 모니터링 VM 자체를 감시하고, Grafana가 `up=0`과 디스크 임계를 감시한다. 둘 다 슬랙으로 보낸다.
- **접근.** Grafana는 Tailscale 안에만 연다. 공개 도메인, 리버스 프록시, 인증서가 필요 없고 폰에서도 열린다.
- **구성의 소재.** 모니터링 VM 구성을 `deploy/monitoring/`에 둔다. 배포는 수동이되 구성은 레포에 있어야 서버가 날아가도 되살릴 수 있다.

## Impact

- Affected specs: `observability` (신규 capability)
- Affected code (backend): `build.gradle.kts`(micrometer), `application.yml`과 `application-prod.yml`(관리 포트, 노출 범위, 구조화 로깅), 요청 ID 필터 신규
- Affected infra: `deploy/compose.prod.yml`(Traefik 라벨, Alloy 서비스), `deploy/monitoring/` 신규
- Affected docs: README 운영 섹션
- 마이그레이션: 없음
- 비용: 프리 티어에 해당하면 EBS 20GB 값(월 $1.6 남짓)만 든다. 아니면 t3.micro 포함 월 $9 내외
- **스코프 밖**: 분산 추적(traceId, spanId), 에러 추적 서비스(Sentry), 백엔드 헬스체크와 컨테이너 메모리 제한(다음 change), 에러 급증 알림(임계값을 정할 데이터가 아직 없다), 로그 기반 사용자 행동 분석
