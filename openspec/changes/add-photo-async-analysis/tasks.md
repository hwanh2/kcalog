# Tasks: add-photo-async-analysis

## 1. Object Storage 인프라 (photo-storage)

- [x] 1.1 `StorageService` 인터페이스 + 로컬 구현 — put(key 반환)/get/delete, MinIO(S3 SDK) 연동, `app.storage.*` 설정. `S3StorageService`+`StorageConfig`
- [x] 1.2 docker-compose에 MinIO 추가 + `application.yml`(로컬 기본값)·`application-prod.yml`(S3/R2 필수 fail-closed)·`.env.example` 갱신
- [x] 1.3 사진 접근 — `GET /api/photos/{ownerId}/{name}` 소유권 검증 프록시(key가 memberId 스코프라 경로 비교로 검증)
- [x] 1.4 스토리지 통합 테스트 — 저장·조회·삭제·타인/미존재 404·인증 (인메모리 fake로 단일 컨테이너 유지)

## 2. 백엔드: 비동기 분석 작업 (async-food-analysis)

- [x] 2.1 Flyway `V8__analysis_job.sql` — analysis_job(member_id FK, status, image_key, result_json TEXT, error_code, timestamps) + 인덱스 *(이탈: JSONB 대신 TEXT — 확인 전 임시 결과라 조회 유연성 불필요)*
- [x] 2.2 `AnalysisJob` 엔티티·리포지토리·`AnalysisStatus` enum — 상태 전이 도메인 메서드(complete/noFood/fail), 소유권
- [x] 2.3 `POST /api/analyses` — 멀티파트 → 사진 저장 → 작업 생성(ANALYZING) → jobId 즉시(202) 반환, 커밋 후 `@Async` 트리거. 일일 제한 이관(`enforceDailyLimit`)
- [x] 2.4 백그라운드 워커 `AnalysisWorker` — `MealAnalysisService.analyzeImage` 호출 후 결과 기록(COMPLETED/NO_FOOD/FAILED). `AsyncConfig` ThreadPoolTaskExecutor
- [x] 2.5 `GET /api/analyses/{id}` — status + 결과(items·사진 URL), 소유권(타인 404)
- [x] 2.6 재시작 복구 `AnalysisStartupRecovery` — 기동 시 ANALYZING 잔여를 FAILED(INTERRUPTED)로
- [x] 2.7 미확인 작업 정리 `AnalysisCleanup` — `@Scheduled`로 보존 기간(기본 24h) 지난 작업·사진 삭제
- [x] 2.8 통합 테스트 — 생성·폴링(완료/NO_FOOD/실패)·타인·429·기동 복구·정리 (Awaitility, 비트랜잭션+정리)

## 3. 백엔드: meal 사진 연결 (meal-logging)

- [x] 3.1 Flyway `V9__meal_image.sql` — meal에 `image_key VARCHAR NULL` 추가(additive)
- [x] 3.2 `POST /api/meals`에 `analysisJobId`(선택) — 컨트롤러가 `consumeJobImage`로 작업 사진 인수(작업 행 삭제, 사진은 meal 소유), 수동은 없음
- [x] 3.3 `MealResponse`에 `imageUrl` 추가, 삭제 시 `StorageService.delete` 연동
- [x] 3.4 meal 사진 연동 테스트 — 저장 시 연결·작업 삭제, 조회 imageUrl, 삭제 시 사진 제거, 수동 입력 사진 없음, 타인 작업 404

## 4. 프론트: 비동기 촬영 흐름

- [x] 4.1 api 클라이언트 `analysis.ts` — `createAnalysis(image)`, `getAnalysis(id)`, `pollAnalysis` 헬퍼
- [x] 4.2 `MealRecordPage` — 업로드→폴링(간격·타임아웃)→완료/NO_FOOD/실패 분기, 실패·429·타임아웃 수동 폴백
- [x] 4.3 확인·저장 — 기존 오버레이·바텀시트 재사용, 저장 시 `analysisJobId` 전달
- [x] 4.4 흐름 테스트 — 완료→확인→저장(analysisJobId), NO_FOOD·429 폴백, `pollAnalysis` 단위(폴링·타임아웃)

## 5. 프론트: 사진 표시

- [x] 5.1 `AuthImage`(Bearer로 사진 fetch→objectURL) + 홈·음식기록 목록 썸네일(없으면 미표시)
- [x] 5.2 `AuthImage` 테스트 — Bearer 로드·실패 처리

## 6. 마무리

- [x] 6.1 전체 회귀 — 프론트 101 통과·tsc·oxlint·build, 백엔드 전체 통과
- [x] 6.2 `.env.example`·README(스토리지·MinIO) 갱신, 프론트 `analyzeMeal` 제거·백엔드 동기 엔드포인트 deprecate(레거시 표기), 설계 이탈 design.md 반영
