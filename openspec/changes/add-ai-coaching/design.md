# Design: add-ai-coaching

## Context

현재: AI PT 탭은 `ComingSoonPage`. 재료는 모두 준비됨 — 리포트 신호(`ReportCalc.Signals`, 구조화), 적응형 TDEE(`TdeeService.get`), 체중 추세·연속(`WeightTrend`/`WeightStats`), 일별 집계(`MealDailyIntake`), 목표 매크로(`MacroTargetG`), 얇은 LLM 경계(`OpenAiClient.complete(Map)`). 결정은 사용자 그릴링(2026-08-11) 확정: **카드 + 대화형 Q&A 둘 다**, 디자인은 `docs/png/04-ai-pt.png`. 하이브리드 = 숫자는 규칙이 계산, 서술만 LLM.

## Decisions

### D1. 범위 = 브리핑 카드 + 대화형 Q&A (그릴링 확정)
AI PT 탭 = ① 오늘의 브리핑 코칭 카드(+3스탯) ② 코치 채팅(퀵칩·멀티턴·초기화) ③ 오늘의 추천(브리핑 팁 렌더). 홈에는 브리핑 headline 한 줄.

### D2. 영속화 = coaching 도메인, 하루 1회 캐시 + 대화 히스토리 (비영속 원칙에서 이탈)
LLM 비용/레이트 때문에 매 조회 생성 불가.
- **`coaching_message`**: 오늘의 브리핑을 `(member_id, coach_date)` UNIQUE로 하루 1개 저장 — `signals_json`(생성 근거 스냅샷), `headline`, `message`, `tips_json`. 첫 조회 시 없으면 생성·저장, 이후 캐시 반환.
- **`coaching_chat_message`**: 대화 턴 영속 — `member_id, role(USER|ASSISTANT), content`. 조회는 시간순, 초기화는 회원 것 전체 삭제.
- 다른 도메인(리포트·TDEE)의 비영속 원칙과 다르나, 설계 문서 D(코칭)가 `coaching_message` 테이블·"하루 N회 캐싱"을 명시. 영속하는 건 **LLM 산출물**뿐이고 신호는 여전히 조회 시 재계산.

### D3. 생성 트리거 = 지연 생성 (그릴링 확정)
그날 첫 `GET /api/coach/briefing`에서 오늘 행이 없으면 신호 수집 → LLM → 저장. 이후 조회는 캐시. 스케줄 배치(전 회원 야간 생성)는 활성 사용자 선별·인프라가 커서 후속으로.

### D4. LLM 입력 = 구조화 신호 주입 (하이브리드 핵심)
브리핑·채팅 모두 프롬프트에 **우리가 계산한 숫자 요약**을 넣고 LLM은 서술만 한다(환각·오수치 방지).
- **신호 수집(`CoachingSignals`)**: 오늘 섭취(kcal·탄단지) vs 목표, 최근 7일 리포트 `Signals`(달성일·초과/미달·연속), TDEE(실측/공식·유지칼로리), 체중 추세 Δ(7일)·연속일. 기존 서비스 재사용, coaching 전용 계산 없음.
- **브리핑 프롬프트**: 시스템=코치 페르소나(한국어·간결·근거 기반·의료 단정 금지) + 신호 JSON → 구조화 출력 `{headline, message, tips[]}`(response_format json).
- **채팅 프롬프트**: 시스템=코치 + 신호 요약 + 최근 대화 N턴 + 사용자 질문 → 자연어 응답 텍스트.

### D5. 비용·레이트 상한 (그릴링 확정)
- 브리핑: 캐시로 하루 1회 자연 제한.
- 채팅: `coaching_chat_usage(member_id, usage_date, call_count)` 카운터로 일일 상한(`AnalysisUsageRepository`와 동일한 원자적 upsert 패턴). 초기화가 카운터를 리셋하지 않아 우회 불가. 상한 초과 시 429류 안내(도메인 예외 → `GlobalExceptionHandler`). 설정 `app.openai.daily-coach-chat-limit`(기본 30).

### D6. 폴백 = 규칙 문구 (그릴링 확정)
LLM 호출 실패(에러·타임아웃·빈 응답) 시:
- 브리핑: `ReportCalc.insights` 상위 문구를 message로, headline은 스탯 기반 템플릿("이번 주 잘 지키고 있어요" 등). 팁은 비움. `source=FALLBACK`.
- 채팅: "지금은 답변을 못 드려요, 잠시 후 다시" 류 안내(카운터는 증가시키지 않음 — 실패는 과금 안 함).

### D7. 3스탯 = 기존 계산 재사용
- 감량 Δ: 체중 추세(EMA) 최근 7일 변화(`WeightTrend`), 기록 부족 시 null.
- 달성률: 최근 7일 `onTargetDays / daysLogged`(%), 목표·기록 없으면 null.
- 연속: `WeightStats.streak`(체중 기록 연속일). 목업의 "연속 14일".

### D8. 구조화 출력·파싱
브리핑은 OpenAI `response_format: json_object` + 프롬프트에 스키마 명시. `OpenAiClient.complete`가 content 문자열 반환 → `new ObjectMapper()`로 파싱(프로젝트 관례, MealAnalysis와 동일). 채팅은 평문 텍스트라 파싱 없음.

### D9. 홈 코칭 한 줄
홈 대시보드가 `GET /api/coach/briefing`의 headline을 소비해 상단 한 줄 카드로. 브리핑 없음/데이터 부족이면 카드 숨김(홈 나머지는 영향 없음).

## Risks / Trade-offs

- [LLM 비용·레이트] → 브리핑 캐시(1일 1회) + 채팅 일일 상한. 상한·모델은 설정으로 튜닝.
- [환각·오수치] → 숫자는 전부 프롬프트로 주입, LLM은 서술만. 신호에 없는 수치는 만들지 말라고 지시.
- [비영속 원칙 이탈] → LLM 산출물만 저장(신호는 재계산). 설계 문서가 테이블을 명시하므로 정당.
- [의료·과장 조언] → 시스템 프롬프트에서 진단·의료 단정 금지, 일반적 식단 가이드로 한정.
- [키 없음(로컬 placeholder)] → 폴백 경로가 항상 동작하므로 키 없이도 화면은 규칙 문구로 채워짐. 통합 테스트는 `OpenAiClient`를 스텁.

## Migration Plan

- **V11**: `coaching_message`(UNIQUE member_id+coach_date), `coaching_chat_message`(index member_id+created_at), `coaching_chat_usage`(PK member_id+usage_date). `ddl-auto=validate`라 엔티티와 정합 필수.
- 라우팅에서 `/coach`(AI PT) ComingSoon → 실제 페이지 교체.

## Open Questions (구현으로 확정)

- ~~채팅 히스토리 프롬프트 주입 턴 수~~ → 최근 **10턴**(`CoachingService.HISTORY_TURNS`), 현재 질문 저장 전 히스토리를 주입.
- ~~브리핑 팁 개수~~ → 2~3개(프롬프트 지시), 프론트는 있는 만큼 렌더(`tips.length > 0`일 때만 추천 섹션).
- ~~페르소나 이름("미아")~~ → 프론트 라벨("코치 미아")로만, 백엔드 프롬프트는 중립 "AI 코치".

### D10. 대화 응답 = SSE 스트리밍 (사용자 요청, 2026-08-11)
`POST /api/coach/messages`를 `SseEmitter`로 전환 — 토큰을 도착 즉시 `token`({t}) 이벤트로 흘리고 `done`(저장된 메시지)로 마무리한다.
- **인증 스트리밍**: `EventSource`는 POST·헤더 불가 → 프론트는 `fetch` + `ReadableStream`으로 SSE를 직접 파싱(`parseSseBuffer`, 순수 함수로 테스트).
- **리빌 페이싱**: 모델/네트워크가 토큰을 몰아서 주면 확 나타나 부자연스러워, 도착(target ref)과 노출(shown)을 분리해 타자기처럼 일정 속도로 리빌한다(`REVEAL_CHARS_PER_TICK`/`REVEAL_INTERVAL_MS` 상수로 조절, 기본 ≈ 55자/초). 스트림 종료 후에도 남은 글자를 마저 노출한 뒤 히스토리로 확정.
- **동기/비동기 경계**: 상한 검사·사용자 메시지 저장·신호 수집은 요청 스레드에서 동기로(상한 초과를 429로 반환). 토큰 스트리밍만 `coachStreamExecutor`(별도 빈)로 분리. 테스트는 이 빈을 동기 실행기로 대체해 스트림 완료를 결정적으로 대기하고 트랜잭션 격리를 지킨다.
- **저장·과금**: 스트림 완료 시 assistant 메시지 저장 + 성공 시에만 사용량 증가. 저장은 repository.save(기본 tx)+JdbcClient(autocommit)로 각각 원자적(별도 스레드라 요청 tx와 분리).

### D12. 오늘의 추천 카드 + 홈 칼로리 헤더 (사용자 요청, 목업)
- **오늘의 추천**: 브리핑 출력을 `tips: string[]` → `recommendations: [{category, title, detail}]`(category=meal/activity/hydration/habit)로 확장. LLM이 조언으로 생성하고 **추적하지 않는 활동·수분은 일반 제안**으로만(수치 조작 금지). 프론트는 분류별 아이콘·색으로 카드 렌더. 저장 컬럼 `tips_json`→`recommendations_json`(V11 미머지라 직접 수정).
- **홈 칼로리 헤더**: 홈 상단 코칭 한 줄을 "오늘의 칼로리" 헤더로 — 코칭 headline(있으면)과 리포트 바로가기(`/report`). 코칭 데이터가 없으면 부제만 숨기고 헤더·링크는 유지.

### D11. 코치 응답 마크다운 렌더 (사용자 요청)
LLM이 `**굵게**`·목록을 쓰므로 코치 버블을 마크다운으로 렌더. 의존성 최소화 기조(차트=인라인 SVG)에 맞춰 `react-markdown` 대신 굵게·인라인코드·불릿/번호 목록·문단만 지원하는 경량 `CoachMarkdown`을 작성 — `dangerouslySetInnerHTML` 없이 React 노드로 변환해 XSS 차단. 사용자 버블은 평문.

## 구현 이탈 (design 대비)

- **LLM 실패 브리핑은 비영속**: 캐시는 성공(LLM) 결과만 저장한다. 폴백(source=FALLBACK)은 저장하지 않아, 일시적 LLM 장애가 그날 코칭을 잠그지 않고 다음 조회에서 재시도된다(비용은 실패가 드문 전제).
- **채팅 사용 카운터는 성공 후 증가**: `coaching_chat_usage`는 응답 성공 시에만 `increment` — 실패는 과금하지 않는다(spec 부합). 상한 검사는 `count(...) >= limit`로 저장 전에 판정해 사용자 메시지 orphan을 만들지 않는다.
- **3스탯 재계산**: 캐시된 브리핑을 읽을 때 저장된 `signals_json` 스냅샷을 역직렬화해 스탯을 도출 — 서술(캐시)과 지표의 근거를 일치시킨다.
- **ComingSoonPage 제거**: AI PT가 마지막 준비중 탭이라 `ComingSoonPage`가 죽은 코드가 되어 삭제. AppShell 테스트는 스텁 라우트로 내비게이션만 검증하도록 갱신.
- **홈 코칭 한 줄**: 별도 API 없이 홈이 `getBriefing`을 소비(쿼리 키 `coachBriefing` 공유). 오늘 날짜 + `hasData`일 때만 노출.
- **브리핑 `response_format`(D8 이탈)**: D8은 `json_object`로 적었으나 구현은 `json_schema` + `strict: true`. 스키마를 모델에 강제해 필드 누락·형식 흔들림을 줄이려는 선택으로, 파싱 경로(content 문자열 → `ObjectMapper`)는 D8 그대로다.

## 리뷰 대응 (PR #31)

- **채팅 상한 TOCTOU(🔴)**: `count() >= limit` 검사 후 스트리밍 성공 시 증가하는 구조라, 검사~증가 창이 스트리밍 시간(최대 60초)만큼 벌어져 동시 요청이 모두 상한을 통과했다. `tryReserve`(`ON CONFLICT DO UPDATE ... WHERE call_count < :limit RETURNING`)로 **요청 스레드에서 원자적 선점**하고, 스트리밍 실패·취소 시 `release`로 되돌려 '실패 미과금' 정책을 유지한다.
- **브리핑 동시 최초 조회 500(🔴)**: `@Transactional` 안에서 `save`가 UNIQUE를 위반하면 트랜잭션이 rollback-only가 되어, 폴백을 반환해도 커밋 단계에서 `UnexpectedRollbackException`(500)이 났다. `briefing()`의 `@Transactional`을 제거해 저장을 리포지토리 자체 트랜잭션에 맡기고, `DataIntegrityViolationException`은 '경쟁에서 짐'으로 보고 저장된 브리핑을 재조회해 반환한다. 부수 효과로 **수 초짜리 LLM 호출이 DB 트랜잭션·커넥션을 점유하던 문제**도 함께 해소된다(`chatStream`도 같은 이유로 트랜잭션 제거 — 워커의 `release`가 미커밋 선점을 놓치는 문제까지 방지).
- **SSE 취소 처리**: `onTimeout`/`onError`/`onCompletion`에서 취소 플래그를 세우고 토큰 방출 시 확인해 OpenAI 읽기를 중단한다. 취소 시에는 생성 중이던 답을 폴백 문구로 덮어써 저장하지 않는다.
- **프론트 스트림 정리**: `streamMessage(content, onToken, signal)`에 `AbortSignal`을 넘기고 읽기 루프를 `try/finally`로 감싸 `reader.cancel()`을 보장. `CoachPage`는 언마운트 시 `AbortController.abort()`로 진행 중 연결을 끊는다.
- **보류**: 일일 카운터 공용 추출(`AnalysisUsageRepository`까지 건드려 이번 change 스코프 밖), `CoachingMessage`→`CoachingBriefing` 개명, `useTypewriter` 훅 분리.
