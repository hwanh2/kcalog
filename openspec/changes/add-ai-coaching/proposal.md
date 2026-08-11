# add-ai-coaching

## Why

마지막 탭인 AI PT(현재 준비 중)를 채워 차별점 #3 "데이터 기반 개인 코칭"을 완성한다. 앞선 change들이 만든 구조화 신호(리포트 `Signals`·TDEE·체중 추세·오늘 섭취 vs 목표)를 LLM에 **숫자로 주입**해, 규칙이 못 내는 자연어 코칭·대화를 제공한다(하이브리드 — 숫자는 우리가 계산, 서술만 LLM이). 지금까지의 비영속 원칙과 달리 코칭은 LLM 비용/레이트 때문에 **하루 1회 캐시**하고 대화 히스토리를 영속한다.

## What Changes

- **오늘의 브리핑 코칭** — 구조화 신호를 LLM에 주입해 오늘의 코칭(headline·본문·팁)을 생성. 하루 1회 생성·캐시(첫 조회 시 지연 생성). 3스탯(감량 Δ·목표 달성률·연속일)을 함께 반환. LLM 실패 시 규칙 인사이트 문구로 폴백.
- **대화형 코칭 Q&A** — 사용자가 코치에게 자유 질문, LLM이 개인 데이터 기반으로 응답을 **SSE로 토큰 스트리밍**. 대화 히스토리 영속(조회·초기화). LLM 비용 방어를 위한 일일 메시지 상한. 응답은 마크다운(굵게·목록)으로 렌더.
- **홈 코칭 한 줄** — 홈 대시보드에 오늘 브리핑의 headline을 한 줄로 노출.
- **UI** — AI PT 탭 구현(ComingSoon 교체): 브리핑 카드 + 3스탯 + 퀵칩·채팅·초기화 + 오늘의 추천(브리핑 팁). 홈에 코칭 한 줄. 목업 `docs/png/04-ai-pt.png` 기준.

## Impact

- Affected specs: `ai-coaching` (신규 capability)
- Affected code (backend): `coaching` 도메인 신설 — `CoachingMessage`(오늘 브리핑, 하루 1개)·`CoachingChatMessage`(대화) 엔티티, `CoachingService`(신호 수집 → 프롬프트 → LLM → 폴백), `CoachingBriefingResponse`/`CoachingChatMessageResponse` DTO, `CoachController` `GET /api/coach/briefing`·`GET/POST/DELETE /api/coach/messages`; 기존 `OpenAiClient.complete` 재사용, `ReportCalc`/`TdeeService`/`WeightStats`/`MealDailyIntake` 신호 재사용. Flyway V11(coaching 테이블·채팅 사용 카운터). `AppProperties.Openai`에 `dailyCoachChatLimit` 추가.
- Affected code (frontend): `api/coach.ts`, AI PT 탭 페이지(브리핑·3스탯·채팅·추천), 홈 코칭 한 줄, 라우팅에서 ComingSoon 대체
- 마이그레이션: V11 (coaching_message·coaching_chat_message·coaching_chat_usage)
- 스코프 밖: 운동·수분 도메인(오늘의 추천은 브리핑 팁으로만), 코칭 공유·푸시 알림, 멀티모달(사진 첨부) 대화, 코치 페르소나 선택
