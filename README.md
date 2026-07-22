# kcalog (칼로그)

한식 사진 한 장으로 10초 안에 식사가 기록되는 체중 관리 앱.

## 모노레포 구조

```
kcalog/
├── frontend/   # Vite + React SPA (PWA)
├── backend/    # Spring Boot 3 + JPA + Postgres
├── eval/       # 식사 분석 프롬프트 평가 세트 (한식 사진 + 기대값)
└── openspec/   # 스펙 주도 개발 (OpenSpec)
```

## 기술 스택

- **프론트**: Vite + React SPA, PWA(vite-plugin-pwa), TanStack Query
- **백엔드**: Spring Boot 3, JPA, Postgres, Spring Security + OAuth2(카카오/구글) + JWT
- **스토리지**: S3/Cloudflare R2 (식사 사진, presigned URL 직접 업로드)
- **AI**: Claude Vision API — 식사 사진 분석, 주간 리포트 생성
- **운영 인프라**: 프론트 Vercel/Cloudflare Pages, 백엔드 Docker(단일 VPS/fly.io), DB Neon

## MVP 기능

1. 온보딩·목표 설정 — 소셜 로그인, 일일 칼로리 목표 자동 계산
2. 식사 기록 — 사진 촬영 → AI 분석(메뉴·칼로리·탄단지) → 확인/수정 → 저장 (30초 이내 목표)
3. 하루 대시보드 — 타임라인, 남은 칼로리, 탄단지 비율
4. 체중 기록 — 추이 그래프
5. 운동 기록 (간단) — 종류·시간 → MET 기반 소모 칼로리 추정
6. 주간 AI 리포트 — 온디맨드 생성 + 주 단위 캐시
