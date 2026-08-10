# kcalog (칼로그)

사진 한 장으로 10초 안에 식사가 기록되는 AI 식단·체중 관리 앱. (서비스명 미정 — kcalog는 임시 이름)

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
