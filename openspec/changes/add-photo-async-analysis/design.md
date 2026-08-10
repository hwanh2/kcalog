# Design: add-photo-async-analysis

## Context

현재: `POST /api/meals/analyze`가 동기로 OpenAI를 호출해 결과만 반환(무저장), `POST /api/meals`가 확정값만 저장. meal에 사진·상태 없음. 이 change는 분석을 비동기화하고 사진을 저장한다. 결정은 사용자 그릴링(2026-08-10)으로 확정됐다.

## Decisions

### D1. 비동기 채택 (그릴링 확정)
동기는 "분석 중 이탈 시 진행 분석이 사라지고 재촬영/재요청 필요"라는 UX 한계가 있다. "찍어두고 나중에 완료된 결과 확인"을 살리기 위해 **진짜 비동기**(작업 영속화 + 폴링)를 채택한다. 트레이드오프: 인프라·실패 모드 복잡도 증가. (동기가 적합한 경우 = 단일·짧은 호출·저트래픽·대기 흐름. 우리는 이탈 UX를 우선해 비동기로.)

### D2. meal은 확정본만 — 별도 `analysis_job` 엔티티 (그릴링 확정)
분석 결과를 사용자 확인 전에 남겨야 하는데, meal에 status(초안)를 두는 대신 **`analysis_job`** 에서 돌린다. 확인·수정 후 저장할 때만 `meal`이 생성된다(지금과 동일하게 meal은 항상 확정본). 이유: 대시보드·타임라인이 status 필터 없이 그대로 동작하고, meal 생명주기가 단순.
- `analysis_job`: `id, member_id, status, image_key, result_json(완료 시), error_code(실패 시), created_at, updated_at`.
- status: `ANALYZING → COMPLETED | FAILED | NO_FOOD`. COMPLETED면 `result_json`에 items[]·overallConfidence·notes(기존 `MealAnalysisResponse` 형태).
- 확인 저장은 기존 `POST /api/meals`를 재사용하되 `analysisJobId`(선택)를 받아 그 작업의 `image_key`를 meal에 복사한다.

### D3. Object Storage — `StorageService` 추상화 (그릴링 확정)
LLM(`OpenAiClient`)처럼 스토리지도 인터페이스로 경계를 둔다. 로컬은 MinIO(docker-compose), 운영은 S3/R2. 구현 교체는 설정으로.
- `StorageService`: `String put(byte[] bytes, String contentType)`(key 반환) · `byte[] get(String key)` · `void delete(String key)` · `String url(String key)`(접근 URL).
- 업로드 경로: 클라이언트 → 백엔드 멀티파트 → 백엔드가 `put`으로 저장 + 같은 바이트를 OpenAI 워커로 전달(presigned 직업로드보다 단순, 백엔드가 어차피 바이트 필요).
- 접근: MVP는 백엔드 프록시(`GET /api/photos/{key}`, 소유권 검증) 또는 서명 URL. 프록시가 소유권 검증이 쉬워 1차 채택(구현에서 확정).

### D4. 실행 모델 — `@Async` + 시작 시 복구 (그릴링 확정)
`@Async`(Spring `ThreadPoolTaskExecutor`)로 인프로세스 백그라운드 실행. 단일 인스턴스 MVP에 가장 단순하고 Spring 학습에도 적합. 재시작으로 끊긴 작업 대비:
- **기동 복구**: `ApplicationRunner`가 시작 시 ANALYZING로 남은 작업을 FAILED(error_code=INTERRUPTED)로 정리 → 프론트가 "다시 분석" 유도.
- 스케줄러 DB 폴러 대비 트레이드오프: 다중 인스턴스·자동 재개는 안 되지만, MVP 단일 인스턴스엔 과함. 스케일 시 폴러/브로커 전환(문서 명시).

### D5. 결과 전달 — 폴링
`GET /api/analyses/{id}`를 프론트가 짧은 간격(예: 1.5초)으로 폴링해 status를 확인, COMPLETED면 결과를 받아 확인 화면으로. SSE보다 단순하고 PWA·오프라인 재개에 무난. 폴링 상한(타임아웃) 두어 무한 대기 방지.

### D6. 사진 수명주기·정리
- 확정 meal에 연결된 사진: meal 삭제 시 함께 삭제(서비스에서 `StorageService.delete`).
- 미확인 `analysis_job`(확인 저장 안 된 것)과 그 사진: 생성 후 N시간(예: 24h) 지나면 `@Scheduled` 정리로 job·사진 삭제. 비용·프라이버시.
- 실패/NO_FOOD 작업의 사진도 정리 대상.

### D7. 일일 분석 제한 이관
기존 `analysis_usage` 상한 판정을 analyze 컨트롤러 → **작업 생성(`POST /api/analyses`)** 시점으로 옮긴다. 원자적 증가+판정(기존 `incrementAndGet`) 재사용. 실패 호출도 카운트 유지(비용 발생).

### D8. 워커 재사용
백그라운드 분석 로직은 기존 `MealAnalysisService`(OpenAI 호출·구조화 출력·재시도·NO_FOOD 판정)를 그대로 워커에서 호출하고, 결과를 `analysis_job`에 기록하는 얇은 오케스트레이션만 추가한다. 분석 프롬프트·파싱은 변경 없음.

## Risks / Trade-offs

- [인프로세스 @Async는 재시작 시 작업 유실] → 기동 복구로 FAILED 처리(데이터 정합성 안전, 재요청 필요). 다중 인스턴스·자동재개는 스케일 시 폴러/브로커로.
- [사진 저장으로 비용·프라이버시] → 미확인/실패 작업 사진 주기 정리, 확정 meal 사진만 장기 보관. 삭제 연동.
- [폴링 오버헤드] → 짧은 분석(수초)이라 폴링 횟수 적음. 상한·백오프로 방어. 트래픽 커지면 SSE 검토.
- [MinIO 로컬 의존 추가] → docker-compose에 포함, 키 없이 기본값 동작. 운영만 S3·R2 필수.
- [meal에 image_key 추가(nullable)] → MANUAL·구 기록은 null. additive 마이그레이션.

## Migration Plan

- `V8__analysis_job.sql`: analysis_job 테이블(member_id FK, status, image_key, result_json TEXT, error_code, timestamps).
- `V9__meal_image.sql`: meal에 `image_key VARCHAR NULL` 추가(additive).
- `docker-compose`에 MinIO 서비스 추가. `application.yml`에 `app.storage.*`(provider, bucket, endpoint, keys), `application-prod.yml`은 S3·R2 필수(fail-closed).
- `.env.example`·README에 스토리지 설정 추가.
- 기존 `POST /api/meals/analyze`(동기)는 제거 또는 deprecate — 프론트 전환과 함께 제거(미배포라 자유).

## Open Questions (구현으로 확정)

- ~~사진 접근 프록시 vs 서명 URL~~ → **프록시** 채택(`GET /api/photos/{ownerId}/{name}`). Bearer 인증이 필요한데 `<img src>`는 헤더를 못 실으므로 프론트는 `AuthImage`(fetch→blob→objectURL)로 로드. key가 `{memberId}/{uuid}` 스코프라 경로 memberId 비교로 소유권 검증(DB 조회 불필요).
- ~~`result_json` 형식~~ → **TEXT**(JSON 문자열). 확인 전 임시 결과라 JSONB 질의 유연성 불필요, 매핑 단순화. `MealAnalysisResponse`를 그대로 (역)직렬화.
- ~~폴링 간격·타임아웃~~ → 기본 1.5s 간격·60s 타임아웃(`pollAnalysis` 파라미터로 주입 가능, 테스트는 sleep 목킹).
- ~~MinIO vs 파일시스템~~ → **MinIO**(운영 S3와 API 동일). 로컬 docker-compose 기본값으로 키 없이 동작.

## 구현 이탈 (design 대비)

- 동기 `POST /api/meals/analyze`는 제거 대신 **레거시로 유지(deprecate)** — 단위 테스트가 분석 내부 로직(재시도·파싱·NO_FOOD)을 커버 중이라 지금 제거하면 테스트 재구성 리스크. 프론트 `analyzeMeal`은 제거(죽은 코드). 후속에서 서비스 분리 후 제거.
- 비동기 통합 테스트는 워커가 별도 트랜잭션에서 커밋된 작업을 읽어야 해 `@Transactional`을 쓰지 않고 Awaitility + 수동 정리. 스토리지는 인메모리 fake로 단일 Testcontainers 컨테이너 유지.
