# AGENTS.md

AI 코딩 에이전트(Claude Code, Cursor 등)를 위한 저장소 가이드. 벤더 중립 원본이며, 도구별 파일(`CLAUDE.md`)은 이 파일을 가리킨다.

## 프로젝트 개요

"한식 사진 한 장으로 10초 안에 식사가 기록되는 체중 관리 앱" MVP. 실서비스 출시 지향 + Spring 학습 목적 사이드 프로젝트. **서비스명 미정** — kcalog는 임시 이름이며 확정 시 레포명/패키지명(`com.kcalog`)을 일괄 변경한다.

설계 확정본: `docs/2026-07-22-mvp-design.md` — 기능 범위·데이터 모델·아키텍처 결정은 이 문서가 기준.

## 작업 워크플로우 (중요)

- **OpenSpec 스펙 주도 개발**: 기능 작업은 `openspec/changes/<name>/`의 proposal → design → specs → tasks 순서를 따른다. 구현 전 tasks.md 확인, 완료한 태스크는 즉시 `- [x]`로 체크.
- **PR 기반**: main에 직접 커밋 금지. 스펙은 `spec/<change>`, 구현은 `feat/<change>` 등 브랜치로 PR을 올린다. change 하나가 커도 PR은 작업 그룹 단위(리뷰 가능한 크기)로 쪼갠다.
- 구현 중 설계와 어긋나는 결정을 하면 해당 change의 design.md에 이유와 함께 반영한다.
- 변경된 모든 줄은 사용자 요청(태스크)으로 추적 가능해야 한다 — 요청 밖의 인접 코드 "개선"·리팩터링 금지.
- 태스크는 검증 가능한 목표로 다룬다: 완료 판정은 "다 했다"가 아니라 테스트·빌드·실행 등 검증 명령 통과다.
- 커밋 메시지·문서·PR은 한국어로 쓴다 (기술 용어는 원어 유지).

## 구조

```
backend/   Spring Boot 4.0.x · Java 21 · Gradle Kotlin DSL · JPA · Postgres · Flyway
frontend/  Vite 8 · React 19 · TypeScript · react-router 8 · TanStack Query · PWA
eval/      프롬프트 평가 세트 (한식 사진 + 기대값)
docs/      설계 문서
openspec/  스펙·변경 관리
```

백엔드 패키지는 `com.kcalog.domain.{도메인}.{controller, service, repository, entity, dto, exception}` + `com.kcalog.global.{config, common}` (도메인: auth, member, meal, weight, workout, report).

## 백엔드 코드 컨벤션

- **Lombok**: `@Getter`, `@RequiredArgsConstructor`(생성자 주입만), `@NoArgsConstructor(access = PROTECTED)`, `@Slf4j`. 엔티티 `@Setter` 금지 — 상태 변경은 의도가 드러나는 도메인 메서드로. `@Builder + @AllArgsConstructor` 조합 대신 정적 팩토리(예: `Member.signUp`).
- **DTO**: `dto/` 패키지의 Java record. `{Action}Request` / `{Domain}Response` 네이밍, `Dto` 접미사 금지. 엔티티를 API 응답으로 직접 반환하지 않는다. Jackson은 기본 camelCase 유지 (snake_case 전역 설정 금지).
- **엔티티**: `BaseEntity`(createdAt/updatedAt, `Instant`/UTC) 상속. 시간대 변환은 클라이언트 책임.
- **계층**: 컨트롤러는 얇게(리포지토리 직접 참조 금지), 로직은 서비스에. 조회 전용 메서드는 `@Transactional(readOnly = true)`.
- **REST 경로**: `/api/{domain}` (예: `/api/auth`, `/api/members`).
- **커밋 메시지**: `<타입>: <한국어 요약>` — feat / fix / refactor / test / docs / chore / review.

## 테스트

- 순수 도메인 로직(계산·판정 등 Spring 불필요)은 **TDD**: 스펙 시나리오를 실패하는 테스트로 먼저 옮긴 뒤 구현한다. 프레임워크 배선 코드는 test-after 허용.
- 통합 테스트는 `@IntegrationTest`(커스텀 메타 어노테이션) 사용 — 구성 통일로 Testcontainers 컨테이너 1개를 공유한다. 개별 `@SpringBootTest` 조합 금지.
- 커버리지(JaCoCo)는 측정·PR 가시화 전용. **게이트(강제 기준)를 추가하지 않는다** — 숫자 채우기용 테스트 금지.
- 테스트 이름은 `@DisplayName`(한국어)으로 시나리오를 서술한다.

## 명령어

```bash
docker compose up -d                 # 로컬 Postgres 16 (127.0.0.1:5432, kcalog/kcalog)
docker compose down -v && docker compose up -d   # DB 초기화 (마이그레이션 수정 후 필수)

cd backend && ./gradlew test         # 테스트 (Docker 데몬만 필요 — Testcontainers가 Postgres 자동 기동)
cd backend && ./gradlew bootRun      # API 서버 :8080

cd frontend && npm run dev           # dev 서버 :5173 (/api, /oauth2, /login/oauth2 → :8080 proxy)
cd frontend && npm run build         # tsc + vite build
```

## DB 규칙

- 스키마 변경은 Flyway 마이그레이션(`backend/src/main/resources/db/migration/`)으로만. `ddl-auto=validate`라 엔티티만 고치면 기동이 실패한다.
- 아직 미배포 상태라 main에 머지 전인 마이그레이션은 수정 가능. 머지된 뒤에는 새 버전(V2+)으로만 변경.

## 환경 변수

로컬은 기본값으로 DB까지 동작한다. OAuth 로그인 테스트에만 카카오 키가 필요 — 목록은 `.env.example` 참고. 소셜 로그인은 카카오만 지원한다(구글 등은 추후 변경). `.env`는 gitignore 대상이며 시크릿을 코드/문서에 하드코딩하지 않는다.
