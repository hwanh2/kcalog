# Proposal: add-photo-async-analysis

## Why

현재 식사 분석은 **동기**(요청 후 3~8초 대기, 결과만 반환)이고 **사진을 저장하지 않는다**(base64로 받아 폐기). 이 때문에 (1) 분석 중 화면을 벗어나면 진행 중 분석이 사라지고, (2) 목업의 식사 목록 썸네일·분석 화면 사진 오버레이가 성립하지 않는다. 설계 문서(2026-08-10) Phase 1의 핵심인 "찍어두고 나중에 확인" UX와 사진 보관을 위해 **비동기 분석 + 사진 저장** 인프라를 도입한다.

## What Changes

- **분석을 비동기로 전환**: `POST /api/analyses`가 사진을 저장하고 분석 작업(`analysis_job`)을 ANALYZING 상태로 만든 뒤 **jobId를 즉시 반환**, 백그라운드(`@Async`)에서 OpenAI 분석을 수행한다. 프론트는 `GET /api/analyses/{id}` **폴링**으로 상태(ANALYZING/COMPLETED/FAILED/NO_FOOD)와 결과를 받는다.
- **meal은 확정본만 유지**: 분석은 `analysis_job` 엔티티에서 돌고, 사용자가 확인·수정해 저장할 때만 `meal`이 생성된다(대시보드 필터 불필요). 저장 시 작업의 저장된 사진이 meal에 연결된다.
- **Object Storage 도입**: `StorageService` 추상화로 로컬 MinIO / 운영 S3·R2 교체. 업로드는 클라이언트 → 백엔드 멀티파트 → 백엔드가 스토리지 저장 + 바이트를 OpenAI로 전달.
- **재시작 복구**: 앱 기동 시 ANALYZING로 남은 고아 작업을 FAILED로 정리(재요청 안내). 미확인 작업과 그 사진은 주기적으로 정리.
- **일일 분석 제한 이관**: 기존 analyze 상한(analysis_usage)을 작업 생성 시점으로 옮긴다.
- **사진 표시**: 확정 meal에 사진이 연결돼 홈·음식기록 목록에 썸네일을 보여준다. meal 삭제 시 사진도 삭제.
- 프론트 촬영 흐름을 업로드→폴링→상태 화면(분석중/완료/실패)→확인·저장으로 재구성(기존 오버레이·바텀시트 재사용).

## Capabilities

### New Capabilities

- `photo-storage`: 사진 Object Storage 저장·접근·수명주기 (StorageService 추상화, MinIO/S3·R2)
- `async-food-analysis`: 비동기 분석 작업 — 작업 생성·상태 폴링·백그라운드 처리·재시작 복구·일일 제한·정리

### Modified Capabilities

- `meal-logging`: 동기 분석(저장 없음)·일일 제한 요구를 `async-food-analysis`로 이관(REMOVED), 식사 저장이 분석 작업의 저장된 사진을 참조(MODIFIED), 삭제 시 사진 제거(MODIFIED)

## Impact

- 백엔드: 신규 `analysis_job` 엔티티·마이그레이션, `analysis` 도메인(controller/service/repository), `StorageService` + MinIO/S3 구현, `@Async`·`@Scheduled` 구성, 기동 복구 러너. `MealAnalysisService`는 작업 워커로 재사용. `meal`에 `image_key` 컬럼 추가.
- 프론트: `MealRecordPage` 촬영 흐름 재작성(업로드→폴링→상태), 분석 상태 UI, 목록 썸네일. api 클라이언트에 analyses 엔드포인트.
- 인프라: `docker-compose`에 MinIO 추가, `.env.example`·`application.yml`에 스토리지 설정, `application-prod.yml`은 S3·R2 필수.
- DB: `V8__analysis_job.sql`, `V9__meal_image.sql`(둘 다 additive).
- 스펙: `photo-storage`·`async-food-analysis` 신규, `meal-logging` 델타.
