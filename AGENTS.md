# AGENTS.md

AI 코딩 에이전트(Claude Code, Cursor 등)를 위한 저장소 가이드. 벤더 중립 원본이며, 도구별 파일(`CLAUDE.md`)은 이 파일을 가리킨다.

## 프로젝트 개요

"한식 사진 한 장으로 10초 안에 식사가 기록되는 체중 관리 앱" MVP. 실서비스 출시 지향 + Spring 학습 목적 사이드 프로젝트. **서비스명 미정** — kcalog는 임시 이름이며 확정 시 레포명/패키지명(`com.kcalog`)을 일괄 변경한다.

설계 확정본: `docs/2026-07-22-mvp-design.md` — 기능 범위·데이터 모델·아키텍처 결정은 이 문서가 기준.

## 작업 워크플로우 (중요)

- **OpenSpec 스펙 주도 개발**: 기능 작업은 `openspec/changes/<name>/`의 proposal → design → specs → tasks 순서를 따른다. 구현 전 tasks.md 확인, 완료한 태스크는 즉시 `- [x]`로 체크.
- **PR 기반**: main에 직접 커밋 금지. 스펙은 `spec/<change>`, 구현은 `feat/<change>` 등 브랜치로 PR을 올린다. change 하나가 커도 PR은 작업 그룹 단위(리뷰 가능한 크기)로 쪼갠다.
- 구현 중 설계와 어긋나는 결정을 하면 해당 change의 design.md에 이유와 함께 반영한다.
- 커밋 메시지·문서·PR은 한국어로 쓴다 (기술 용어는 원어 유지).

## 구조

```
backend/   Spring Boot 4.0.x · Java 21 · Gradle Kotlin DSL · JPA · Postgres · Flyway
frontend/  Vite 8 · React 19 · TypeScript · react-router 8 · TanStack Query · PWA
eval/      프롬프트 평가 세트 (한식 사진 + 기대값)
docs/      설계 문서
openspec/  스펙·변경 관리
```

백엔드 패키지는 모듈 경계대로 `com.kcalog.{auth, member, meal, weight, workout, report, common}`. 컨트롤러는 얇게, 로직은 서비스 계층에. Lombok 미사용(plain Java). REST 경로는 `/api/{domain}`.

## 명령어

```bash
docker compose up -d                 # 로컬 Postgres 16 (127.0.0.1:5432, kcalog/kcalog)
docker compose down -v && docker compose up -d   # DB 초기화 (마이그레이션 수정 후 필수)

cd backend && ./gradlew test         # 테스트 (로컬 Postgres 필요)
cd backend && ./gradlew bootRun      # API 서버 :8080

cd frontend && npm run dev           # dev 서버 :5173 (/api, /oauth2, /login/oauth2 → :8080 proxy)
cd frontend && npm run build         # tsc + vite build
```

## DB 규칙

- 스키마 변경은 Flyway 마이그레이션(`backend/src/main/resources/db/migration/`)으로만. `ddl-auto=validate`라 엔티티만 고치면 기동이 실패한다.
- 아직 미배포 상태라 main에 머지 전인 마이그레이션은 수정 가능. 머지된 뒤에는 새 버전(V2+)으로만 변경.

## 환경 변수

로컬은 기본값으로 DB까지 동작한다. OAuth 로그인 테스트에만 카카오 키가 필요 — 목록은 `.env.example` 참고. 소셜 로그인은 카카오만 지원한다(구글 등은 추후 변경). `.env`는 gitignore 대상이며 시크릿을 코드/문서에 하드코딩하지 않는다.

## 기술 제약 (설계 원칙)

- 인프라는 관리형 우선. **Kafka/Redis/MSA 도입 금지** — 학습 범위를 Security/OAuth2, JPA, 외부 API 연동, 배포 자동화로 한정한다.
- AI 분석은 동기 처리(큐 없음), 사진은 presigned URL로 클라이언트가 직접 업로드(서버 중계 금지).
