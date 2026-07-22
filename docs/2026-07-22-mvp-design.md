# 헬스케어 앱 MVP 설계 문서

- 작성일: 2026-07-22
- 상태: 설계 확정 (섹션 1~5 승인 완료), 서비스명 미정
- 서비스명: **미정** — "칼로그(kcalog)"는 동명 서비스가 이미 존재하여 변경 예정. 폴더명/레포명은 이름 확정 후 함께 변경.

## 1. 프로젝트 목적과 방향

- **목적**: 실제 서비스 출시를 지향하는 사이드 프로젝트. 학습 목적(Spring 역량 강화) 겸함.
- **타겟**: 초기에는 넓게 시작 (특정 니치 미정).
- **제품 한 줄 정의**: "한식 사진 한 장으로 10초 안에 식사가 기록되는 체중 관리 앱."
- **전략**: 한식 특화 사진 식사 분석(A)을 훅으로 사용자를 모으고, 쌓인 기록 데이터를 소비하는 대화형 AI 코치(B)로 확장. A가 데려오고, B가 붙잡아두고 수익화.

### 시장 근거 (2026-07 조사)

- 한국 시장: 필라이즈(누적 140만 회원), 인아웃, 다토키 등 AI 체중관리 앱 경쟁 중. 플랜핏이 피트니스 앱 매출 1위.
- 핵심 승부처는 **기록 마찰**: 식사 기록 30초 미만 사용자는 6개월 리텐션 78%, 2분 이상은 23% (해외 데이터). 정확도보다 기록 속도·꾸준함이 승부를 가름.
- 차별화 포인트: 국·찌개·공유 반찬·배달음식 등 해외 앱(Cal AI 계열)이 약한 한식 맥락.

## 2. MVP 범위

핵심 루프: **사진 촬영 → AI 분석 → 확인/수정 → 저장 → 하루 요약** (촬영부터 저장까지 30초 이내 목표)

포함 기능 (전부 최소 버전):

1. **온보딩·목표 설정**: 소셜 로그인 → 키/체중/목표체중/활동량 입력 → 일일 칼로리 목표 자동 계산
2. **식사 기록**: 카메라/갤러리 → AI가 메뉴·양·칼로리·탄단지 추정 → 확인/수정 → 저장
3. **하루 대시보드**: 타임라인, 목표 대비 남은 칼로리, 탄단지 비율
4. **체중 기록**: 하루 1회 입력(같은 날 재입력 시 덮어쓰기), 추이 그래프
5. **운동 기록 (간단)**: 종류·시간 선택 → MET 기반 소모 칼로리 추정 → 하루 요약 반영
6. **주간 AI 리포트**: 일주일 식사·운동·체중 패턴 요약 + 다음 주 조언 1가지 (B로 가는 씨앗)

명시적으로 제외: 대화형 코치, 소셜/커뮤니티, 웨어러블 연동, 음식 DB 검색 입력(분석 실패 시 수동 텍스트 입력만), 푸시 알림, 음식 마스터(영양 DB) 테이블.

## 3. 기술 스택

학습 목적을 반영해 React + Spring 분리 구조로 결정.

- **프론트**: Vite + React SPA, PWA(vite-plugin-pwa), TanStack Query
- **백엔드**: Spring Boot 3 단일 모듈, JPA, Postgres
- **인증**: Spring Security + OAuth2 Client(카카오만, 구글 등은 추후) + JWT — access 토큰은 SPA 메모리, refresh는 HttpOnly 쿠키 (2026-07-22 수정: 카카오 단독으로 축소)
- **스토리지**: S3 또는 Cloudflare R2 (사진), DB에는 객체 키만 저장
- **AI**: Claude Vision API (Spring WebClient 호출) — 식사 분석, 주간 리포트
- **배포**: 프론트 Vercel/Cloudflare Pages, 백엔드 Docker(단일 VPS 또는 fly.io), DB Neon/Supabase 관리형 Postgres
- **원칙**: 인프라는 관리형으로. Spring 학습 범위는 Security/OAuth2, JPA 설계, 외부 API 연동, 배포 자동화로 한정 (Kafka/Redis/MSA 금지).

## 4. 아키텍처

```
[React SPA (PWA)] ──HTTPS/JSON──> [Spring Boot API] ──> [Postgres]
        │                              │  │
        │ (사진 업로드)                  │  └──> [Claude Vision API] (식사 분석)
        └──── presigned URL로 ─────> [S3/R2]      [Claude API] (주간 리포트)
```

- **백엔드 모듈 경계**: `auth`, `member`(프로필·목표), `meal`(기록·분석), `weight`, `workout`, `report`. 컨트롤러는 얇게, 로직은 서비스 계층에.
- **사진 업로드**: 프론트가 presigned URL 요청 → S3/R2 직접 업로드 → 백엔드엔 객체 키만 전달 (서버가 사진 바이트를 중계하지 않음).
- **AI 분석은 동기 처리 (큐 없음)**: `POST /meals/analyze` → 3~8초 내 응답. 프론트는 분석 애니메이션 표시. Celery/배치 불필요.
- **분석 결과는 사용자 확인 후에만 DB 저장**: analyze 시점엔 저장하지 않고, 확인/수정 후 `POST /meals`로 최종 저장.
- **주간 리포트**: 리포트 탭 진입 시 온디맨드 생성 + 주 단위 캐시. 스케줄러 불필요 (푸시 알림 도입 시 `@Scheduled`로 전환).
- **클라이언트 사진 처리**: 업로드 전 긴 변 1024px 리사이즈, JPEG 80% 압축 (약 100~300KB).

## 5. 데이터 모델 (7개 테이블)

### member — 회원 + 프로필 + 현재 목표
`id`, `provider`(KAKAO/GOOGLE), `provider_id`, `email`, `nickname`, `gender`, `birth_year`, `height_cm`, `activity_level`(LOW/MID/HIGH), `target_weight_kg`, `daily_kcal_target`
- 프로필·목표를 별도 테이블로 분리하지 않음 (목표 변경 이력 추적은 YAGNI). `daily_kcal_target`은 온보딩 때 계산, 사용자 수정 가능.

### meal — 한 끼 식사
`id`, `member_id`, `eaten_at`, `meal_type`(BREAKFAST/LUNCH/DINNER/SNACK), `photo_key`(nullable), `source`(AI/MANUAL), `total_kcal`, `carb_g`, `protein_g`, `fat_g`
- 합계는 비정규화. 아이템 수정 시 서비스 계층에서 합계 재계산이 규칙.

### meal_item — 식사 속 개별 음식 (meal 1:N)
`id`, `meal_id`, `food_name`, `portion_desc`, `kcal`, `carb_g`, `protein_g`, `fat_g`, `ai_confidence`(0~1, 수동 입력 시 null)

### weight_log
`id`, `member_id`, `log_date`, `weight_kg`, UNIQUE(`member_id`, `log_date`) — upsert 방식

### workout_log
`id`, `member_id`, `log_date`, `workout_type`(프리셋 enum 10개 내외), `duration_min`, `kcal_burned`
- `kcal_burned` = MET 계수 × 체중 × 시간, 사용자 수정 가능

### weekly_report
`id`, `member_id`, `week_start_date`(월요일), `content`(JSON), UNIQUE(`member_id`, `week_start_date`)
- 진행 중인 주는 생성하지 않음

### refresh_token
`id`, `member_id`, `token_hash`, `expires_at`

## 6. 핵심 플로우: 사진 분석

### 파이프라인
1. 프론트: 촬영/선택 → 리사이즈·압축
2. presigned URL로 업로드 → `POST /api/meals/analyze { photoKey, mealType }`
3. Spring: 이미지 로드 → Claude Vision 호출(structured output으로 JSON 강제) → 검증 → 반환

### 프롬프트 설계 (한식 특화)
- 역할: 한국 음식 영양 분석가 (국·찌개·반찬·배달음식·프랜차이즈에 익숙)
- 규칙: 반찬은 개별 아이템 분리, 공기밥 유무 확인, 국물 요리는 국물 섭취 여부를 보수적으로 추정, 한국 외식 1인분 포션 기준
- 출력 스키마: `{ items: [{ foodName, portionDesc, kcal, carbG, proteinG, fatG, confidence }], overallConfidence, notes }`
- `confidence < 0.5` 아이템은 사용자 확인 유도 플래그 표시

### 확인 화면 UX (30초 목표의 핵심)
사용자 행동 3가지만: 아이템 삭제(스와이프), 양 조절(0.5×/1×/1.5×/2× 버튼, 칼로리 자동 재계산), 저장. 이름 타이핑 수정은 숨겨진 경로. 기본 동작이 "그냥 저장"이 되도록.

### 실패 처리

| 상황 | 처리 |
|---|---|
| 음식이 아닌 사진 | `items: []` + notes → "음식을 찾지 못했어요" + 수동 입력 버튼 |
| Claude API 타임아웃/장애 (15초 제한) | 재시도 1회 → 수동 입력 폴백. 사진은 S3에 있으므로 "나중에 다시 분석" 가능 |
| JSON 파싱 실패 | 서버에서 1회 재요청 후 폴백. 원본 응답 로그 보존 (프롬프트 개선 재료) |
| 업로드 실패 | 사진을 IndexedDB에 보관, 재시도 버튼 |

### 비용 가드레일
회원당 일일 분석 횟수 제한 (예: 20회). 회당 비용 약 $0.01~0.02 수준.

## 7. 화면 구성

하단 탭 4개:
1. **오늘(홈)**: 남은 칼로리 링 + 탄단지 바 + 타임라인. 중앙에 큰 카메라 FAB
2. **기록**: 달력 + 날짜별 조회, 체중 추이 그래프
3. **리포트**: 주간 AI 리포트
4. **프로필**: 목표 수정, 계정 관리

흐름: 카메라 FAB → 촬영/갤러리 → 분석 중(3~8초 애니메이션) → 확인/수정 → 저장 → 홈 복귀(칼로리 링 갱신)

## 8. 테스트 전략

- 서비스 계층 단위 테스트: 칼로리 계산, 합계 재계산, 리포트 주차 판정
- 분석 API: Claude 응답 목킹 통합 테스트
- 프롬프트 평가 세트: `eval/` 폴더에 실제 한식 사진 20~30장 + 기대값 보관. 프롬프트 변경 시마다 수동 검증.

## 9. 프로젝트 구조와 진행 상태

```
kcalog/               # ← 이름 변경 예정
├── frontend/         # Vite + React SPA (PWA) — 미scaffold
├── backend/          # Spring Boot 3 — 미scaffold
├── eval/             # 프롬프트 평가 세트
├── docs/             # 이 문서
└── openspec/         # OpenSpec 스펙 주도 개발 (v1.6.0, --tools claude)
```

- 완료: git init(main), openspec init, README, 디렉터리 골격 (전부 스테이징 상태, 커밋 전)
- 다음 단계:
  1. 서비스명 확정 → 폴더/레포명 변경
  2. 초기 커밋
  3. 프로젝트 폴더에서 Claude Code 재시작 → `/opsx:propose`로 기능 단위 스펙 작성 (온보딩·로그인부터 추천)
