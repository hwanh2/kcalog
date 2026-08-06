## Context

add-auth-onboarding으로 회원·목표·JWT 인증·프론트 인증 흐름이 완성됐다. 이 change는 제품 핵심 루프(식사 기록·체중 기록·하루 대시보드)를 채운다. 범위는 설계 문서의 2026-07-28(1차 축소)·2026-08-05(GPT-5.4 mini) 개정을 따른다.

현재 상태:
- 백엔드: `com.kcalog.domain.{auth,member,weight}` 존재. `weight_log` 테이블은 온보딩에서 생성됨(member_id, log_date UNIQUE, weight_kg, upsert 쿼리 보유). `meal` 도메인은 없음.
- 프론트: 인증·온보딩·프로필 화면 존재하나 **스타일 없음**. 3탭 셸 없음. TanStack Query 배선만 되어 있고 미사용.
- eval: `eval/` 디렉터리는 비어 있음(.gitkeep).

## Goals / Non-Goals

**Goals:**
- 사진 → GPT-5.4 mini 분석 → 확인·수정 → 저장의 식사 기록 루프 (촬영~저장 30초 목표)
- 사진 무저장(분석 입력으로만 사용), 사진 단위 총량(칼로리·탄단지) 기록
- 체중 입력(upsert)·추이 조회, 하루 대시보드(잔여 칼로리·탄단지·타임라인)
- Tailwind 기반 3탭 앱 셸, 기존 화면 편입
- eval 세트로 분석 정확도 측정 근거 확보

**Non-Goals:**
- 운동 기록, 주간 리포트, 음식별 아이템 분석(meal_item), 사진 영구 보관 → 이후 change
- 실시간 스트리밍 분석, 배치·큐(분석은 동기 처리)
- 서비스명 확정·리브랜딩

## Decisions

### D1. meal 테이블: 사진 단위 총량 (meal_item 없음)
`meal(id, member_id, eaten_at, meal_type, source, total_kcal, carb_g, protein_g, fat_g)`. 사진 1장 = 기록 1건, 영양값 4개는 meal에 직접. `meal_item`·`photo_key` 컬럼 없음.
- 대안(meal_item 1:N)은 한식 반찬 분리 분석에 필요하나 1차 비범위. 나중에 additive 마이그레이션으로 도입 가능(총량은 유지, 아이템 합계로 재계산).
- `source`(AI/MANUAL): 수동 입력과 AI 추정 구분. `meal_type`(BREAKFAST/LUNCH/DINNER/SNACK): 시간대 기반 기본값 자동 제안.
- Flyway `V4__meal.sql`. member FK ON DELETE CASCADE.

### D2. 분석은 동기 처리, 확인 후에만 저장
`POST /api/meals/analyze`(멀티파트 이미지 + mealType) → OpenAI 호출 → 3~8초 내 영양 JSON 반환. **이 시점엔 저장하지 않는다.** 사용자가 확인·수정 후 `POST /api/meals`로 최종 저장.
- 큐·배치 없음(학습 범위 밖, MVP 규모엔 과함). 프론트는 분석 중 로딩 표시.
- 사진은 분석 호출에만 쓰고 응답 후 폐기 — S3/R2·presigned 불필요.

### D3. OpenAI 연동: WebClient + 구조화 출력
Spring WebClient로 OpenAI Chat Completions(vision) 호출. `response_format`의 json_schema(strict)로 `{ totalKcal, carbG, proteinG, fatG, confidence, notes }` 강제.
- 모델명·API 키·일일 제한은 설정값(`app.openai.*`). GPT-5.4 mini 기본, eval 결과로 교체.
- 파싱 실패 시 1회 재요청 후 폴백(수동 입력). 음식 아님(빈 결과 신호) → "음식을 찾지 못했어요" + 수동 입력.
- 타임아웃(예: 15초) + 재시도 1회. 원본 응답 로그 보존(프롬프트 개선 재료).

### D4. 일일 분석 횟수 제한 (비용 가드레일)
회원당 일일 analyze 호출 횟수 제한(설정값, 예: 20). 저장이 아닌 **분석 호출** 기준. 카운트는 당일 호출 수를 집계(별도 테이블 또는 meal source=AI 당일 카운트 + 실패분 포함 여부는 구현에서 결정). 초과 시 429 + 안내.

### D5. 체중: 기존 upsert 재사용 + 추이 조회 추가
`weight_log`는 이미 존재. `POST /api/weights`(오늘 또는 지정일 upsert), `GET /api/weights?from=&to=`(기간별 추이). 온보딩의 upsert 네이티브 쿼리를 재사용.

### D6. 하루 대시보드: 온디맨드 집계 (캐시·비정규화 없음)
`GET /api/dashboard?date=`가 해당일 meal 합계 + member.daily_kcal_target로 잔여·탄단지 비율·타임라인을 계산해 반환. meal의 total_* 합산은 쿼리로 집계(1차엔 별도 일일 요약 테이블 없음 — 하루 식사 수가 적어 집계 비용 무시 가능).

### D7. 프론트 3탭 셸 + Tailwind
Tailwind CSS(Vite 플러그인)로 스타일 시스템 도입. 하단 탭 3개: 오늘(홈)/기록/프로필. `오늘` 중앙에 카메라 진입점. 기존 온보딩·프로필·홈 화면을 셸·스타일에 편입. 라우팅은 인증 가드 하위에 탭 라우트 구성.
- **디자인 토큰 범위**: 색·타이포·radius·경계색은 `@theme` 커스텀 토큰으로 단일 출처화. **간격(spacing)은 Tailwind 기본 스케일**(`p-4`, `gap-2` 등)을 그대로 사용한다 — 기본 스케일이 사실상 일관 토큰이라 별도 커스텀 spacing 토큰은 두지 않는다.
- 대안(CSS Modules)은 디자인 토큰·반복 유틸을 직접 관리해야 해 1인 개발에 손이 더 감. 컴포넌트 라이브러리는 커스터마이징 제약·번들 부담으로 기각.

### D8. 사진 입력: 네이티브 파일 입력 + 클라이언트 리사이즈
`<input type="file" accept="image/*" capture="environment">`로 카메라/갤러리. 업로드 전 Canvas로 긴 변 1024px 리사이즈·JPEG 80% 압축(약 100~300KB). 별도 카메라 라이브러리 없음.

### D9. 식사 기록 조회·수정·삭제
`GET /api/meals?date=`(날짜별), `PATCH /api/meals/{id}`(영양값·meal_type 수정, 본인 것만), `DELETE /api/meals/{id}`. 모두 `/me` 소유권 검증(memberId=sub).

### D10. eval: 스크립트 + 한식 세트
`eval/`에 한식 사진 20~30장 + 기대값(JSON), 채점 스크립트(각 사진 분석 → MAPE 등 오차 집계). 백엔드 통합 테스트가 아닌 독립 실행 도구(수동 실행, CI 비포함 — 실제 API 비용·키 필요). GPT-5.4 mini vs nano 비교, 프롬프트 변경 검증에 사용.

### D11. TanStack Query 도입
대시보드·기록 조회 등 서버 상태가 여럿 생기므로 이 change부터 TanStack Query를 실제 사용(캐시·무효화). 저장·수정 후 관련 쿼리 무효화로 대시보드 자동 갱신.

## Risks / Trade-offs

- [분석 정확도가 낮을 수 있음(총량 단순화·사진 정보 한계, 연구상 오차 ~36%)] → 사용자 확인·수정 단계가 필수 안전장치. eval로 측정하고 프롬프트·모델로 개선. "정확도보다 기록 속도" 제품 방침과 정합.
- [OpenAI 비용·장애] → 일일 제한(D4), 타임아웃·재시도·수동 입력 폴백(D3). 사진 무저장이라 "나중에 재분석"은 불가(1차 트레이드오프).
- [사진 무저장으로 타임라인에 썸네일 없음] → 1차 수용. 사진 보관은 이후 change(additive).
- [한식 반찬 분리 분석 차별화가 1차엔 빠짐] → meal_item 도입 시 복원(스키마 additive).
- [분석 동기 처리로 요청이 3~8초 점유] → MVP 트래픽엔 문제없음. 커지면 큐 전환(설계 문서 명시).

## Migration Plan

- Flyway `V4__meal.sql` 추가(additive, 기존 테이블 변경 없음). 롤백은 미배포 상태라 마이그레이션 수정 가능(머지 후엔 V5+).
- 환경변수 `OPENAI_API_KEY`·모델명·일일 제한 추가. `application-prod.yml`은 키 필수(fail-closed), 로컬은 키 없으면 분석 기능만 비활성/에러.
- 프론트 Tailwind 도입은 빌드 설정 변경(기능 회귀 없도록 기존 화면 스냅샷 확인).

## Open Questions

- 일일 분석 카운트 저장 위치: 별도 카운터 테이블 vs meal(source=AI) 당일 집계 + 실패 호출 포함 여부 → tasks 단계에서 확정.
- 대시보드 "타임라인"에 표시할 필드 범위(시각·meal_type·총kcal) → specs에서 확정.
- eval 채점 스크립트 언어(백엔드 재사용 위해 Java vs 간단히 Node/Python) → tasks에서 결정.
