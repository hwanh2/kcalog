# Tasks: add-ai-coaching

## 1. 스키마·설정
- [x] 1.1 Flyway V11 — `coaching_message`(UNIQUE member_id+coach_date), `coaching_chat_message`(index member_id+created_at), `coaching_chat_usage`(PK member_id+usage_date)
- [x] 1.2 `AppProperties.Openai`에 `dailyCoachChatLimit` 추가 + application.yml/prod 기본값(30)

## 2. 엔티티·리포지토리
- [x] 2.1 `CoachingMessage` 엔티티(BaseEntity, `of(...)` 정적 팩토리, signals/tips는 JSON 문자열) + 리포지토리(`findByMemberIdAndCoachDate`)
- [x] 2.2 `CoachingChatMessage` 엔티티(role enum USER/ASSISTANT) + 리포지토리(`findByMemberIdOrderByCreatedAtAsc`, `deleteByMemberId`, 최근 N턴)
- [x] 2.3 `CoachingChatUsageRepository` — `AnalysisUsageRepository`와 동일한 원자적 upsert `incrementAndGet`

## 3. 신호 수집 (재사용)
- [x] 3.1 `CoachingSignals` — 오늘 섭취 vs 목표·주간 `ReportCalc.Signals`·`TdeeService` 유지칼로리·체중 추세 Δ·연속을 한 요약으로 조립(기존 서비스 재사용, 신규 계산 없음)
- [x] 3.2 요약 지표 3종(감량 Δ·달성률·연속) 계산 — `WeightTrend`/`onTargetDays`/`WeightStats.streak` 재사용

## 4. LLM·서비스
- [x] 4.1 `CoachingPrompt` — 브리핑 프롬프트(구조화 출력 스키마) + 채팅 프롬프트(신호 요약·최근 N턴·질문) 조립
- [x] 4.2 `CoachingService.briefing(memberId)` — 캐시 조회 → 없으면 신호 수집·LLM·저장, 실패 시 규칙 폴백(`ReportCalc` 상위 문구), 데이터 부족 안내
- [x] 4.3 `CoachingService.chat(memberId, content)` — 일일 상한 검사·카운터, 신호+히스토리 프롬프트→LLM, 양 메시지 저장, 실패 폴백(카운터 미증가)
- [x] 4.4 `CoachingService.history(memberId)` / `clear(memberId)`

## 5. API·DTO
- [x] 5.1 `CoachingBriefingResponse`(headline·message·tips·stats{lossKg·adherencePct·streakDays}·source) / `CoachingChatMessageResponse`(role·content·createdAt)
- [x] 5.2 `CoachController` — `GET /api/coach/briefing`, `GET/POST/DELETE /api/coach/messages` (`@LoginMemberId`)
- [x] 5.3 상한 초과 도메인 예외 + `GlobalExceptionHandler` 매핑
- [x] 5.4 통합 테스트(`@IntegrationTest`, `OpenAiClient` 스텁) — 브리핑 생성·캐시·폴백·데이터부족, 채팅 응답·히스토리·초기화·상한·인가

## 6. 프론트엔드
- [x] 6.1 `api/coach.ts` — 타입 + `getBriefing()`·`getMessages()`·`sendMessage(content)`·`clearMessages()`
- [x] 6.2 AI PT 탭 페이지 — 브리핑 카드(초록 그라데이션·헤드라인·본문) + 3스탯 + 채팅(퀵칩·버블·입력·초기화) + 오늘의 추천(팁 카드). 목업 `04-ai-pt.png` 기준
- [x] 6.3 홈 코칭 한 줄 카드(브리핑 headline, 없으면 숨김)
- [x] 6.4 라우팅 `/coach`(AI PT) ComingSoon → 페이지 교체 (AppShell 테스트 갱신)
- [x] 6.5 프론트 테스트(브리핑·스탯 렌더·채팅 송수신·초기화·데이터 부족/숨김)

## 7. SSE 스트리밍 + 마크다운 (사용자 요청)
- [x] 7.1 `OpenAiClient.stream(body, onToken)` — RestClient.exchange로 `data:` 델타 파싱, 전체 텍스트 반환
- [x] 7.2 `CoachingService.chatStream` — 상한·저장·신호 동기 처리 후 별도 실행기에서 토큰 emit → done. `CoachController` `POST /messages`를 `SseEmitter`로. 스트림 실행기 빈(`coachStreamExecutor`, 테스트는 동기 대체)
- [x] 7.3 프론트 `streamMessage`(fetch+ReadableStream, `parseSseBuffer`) + CoachPage 스트리밍 UI(실시간 버블)
- [x] 7.4 코치 응답 마크다운 렌더(`CoachMarkdown` — 굵게·목록·코드, dangerouslySetInnerHTML 없이)
- [x] 7.5 테스트 — SSE 통합(동기 실행기), `parseSseBuffer`·`CoachMarkdown` 단위

## 8. 오늘의 추천·홈 헤더 (사용자 요청)
- [x] 8.1 브리핑 출력 `tips`→`recommendations{category,title,detail}` — 프롬프트 스키마·DTO·엔티티 컬럼(`recommendations_json`)·파싱·통합테스트
- [x] 8.2 AI PT 오늘의 추천 카드(분류별 아이콘·제목·설명)
- [x] 8.3 홈 "오늘의 칼로리" 헤더(코칭 한 줄 + 리포트 링크) + 테스트

## 9. 마무리
- [x] 8.1 `./gradlew test` · `npm run build` · `npm test` · `openspec validate --strict` 통과
- [x] 8.2 design.md Open Questions 반영
