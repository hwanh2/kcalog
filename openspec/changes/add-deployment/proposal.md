# add-deployment

## Why

기능은 로컬에서만 돈다. 실제 사용자가 쓰려면 운영 환경이 필요하고, 그 순간부터 지금까지 미뤄둔 것들(도메인, HTTPS, 시크릿, 백업, DB 마이그레이션 동결)이 한꺼번에 확정된다.

배포 형태를 정하는 일은 코드에도 되돌아온다. 프론트(Vercel)와 백엔드(GCP)를 분리하면 **지금 코드로는 로그인이 동작하지 않는다** — CORS 설정이 아예 없고, 리버스 프록시 뒤에서 카카오 리다이렉트 URI가 `http://`로 만들어지며, 헬스체크 요청은 401을 받는다. 이 change는 인프라 구성과 함께 그 최소 코드 변경을 담는다.

서비스명은 **kcalog로 확정**한다(도메인 `kcalog.site`). AGENTS.md·README에 남아 있던 "서비스명 미정, 확정 시 레포·패키지명 일괄 변경" 항목이 이로써 닫힌다.

## What Changes

- **운영 토폴로지 확정** — `kcalog.site`(Vercel, 프론트) + `api.kcalog.site`(GCP Compute Engine e2-small VM). VM 한 대에 Traefik(자동 HTTPS) + 백엔드 + Postgres 16을 docker compose로 올린다. 사진은 Cloudflare R2.
- **CORS 신설** — 허용 출처(`kcalog.site`)의 자격증명 포함 요청만 통과. 지금은 설정 자체가 없어 분리 배포 시 모든 API 호출이 브라우저에서 차단된다.
- **프록시 헤더 신뢰** — `forward-headers-strategy`로 `X-Forwarded-Proto`를 반영해 OAuth 리다이렉트 URI가 `https`로 생성되게 한다.
- **헬스체크** — actuator 추가, `/actuator/health`를 인증 없이 공개하고 DB 연결 상태를 포함한다.
- **컨테이너화·배포 파이프라인** — 백엔드 Dockerfile, 운영용 compose(Traefik 라우팅 라벨 포함). `release` 브랜치에 들어오면 GitHub Actions가 이미지를 ghcr.io에 올리고 SSH로 VM에 배포한다. 프론트도 같은 커밋으로 Vercel 운영 배포.
- **SPA 라우트 폴백** — `vercel.json` rewrite. 없으면 `/weight` 같은 경로로 직접 진입할 때 404가 난다.
- **DB 백업** — 매일 `pg_dump` → R2 업로드, 보관 기간 후 정리. 관리형 DB를 쓰지 않으므로 자동 백업이 없다.
- **문서** — README에 운영 구성·배포 절차, AGENTS.md의 서비스명 확정 반영.

## Impact

- Affected specs: `deployment` (신규 capability)
- Affected code (backend): `SecurityConfig`(CORS·헬스체크 permitAll), `application.yml`/`application-prod.yml`(forward-headers, CORS 허용 출처, actuator 노출 범위), `build.gradle.kts`(actuator 의존성), `AppProperties`(허용 출처)
- Affected code (frontend): `vercel.json` 신규, 운영 빌드용 `VITE_API_BASE_URL`
- Affected infra: `backend/Dockerfile`, `deploy/compose.prod.yml`, `deploy/backup.sh`, `.github/workflows/deploy.yml`
- Affected branch: `release` 신설 (배포 대상 브랜치, 보호 규칙 적용)
- 마이그레이션: 없음. **단, 첫 배포 이후 기존 Flyway 마이그레이션(V1~V17)은 수정 불가로 동결된다** — 이후 스키마 변경은 V18+ 로만.
- 스코프 밖: 무중단 배포(배포 중 수 초 단절 감수), 스테이징 환경, 에러 추적(Sentry)·가동 감시, 서비스 전체 LLM 호출 상한·가입 제어(기존 1인당 상한 유지), 다중 인스턴스·오토스케일링
