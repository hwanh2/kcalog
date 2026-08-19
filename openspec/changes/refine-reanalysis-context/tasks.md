# 태스크: 재분석에 직전 맥락을 넘긴다

## 1. 저장

- [x] 1.1 `V22__analysis_reanalysis_context.sql` — `analysis_job`에 `previous_result_json TEXT`, `reanalysis_notes TEXT` 추가
- [x] 1.2 기존 `note` 컬럼은 그대로 둔다. 뜻만 "최초 설명"으로 좁힌다 (D2)
- [x] 1.3 `AnalysisJob.reanalyze` — 결과를 지우지 말고 `previousResultJson`으로 옮긴다 (D1)
- [x] 1.4 `AnalysisJob`에 덧붙인 설명을 JSON 배열로 쌓는다. 줄바꿈 이어붙이기를 쓰지 않는다 (D2)
- [x] 1.5 `AnalysisJob.allNotes()` — 최초 설명 + 덧붙인 설명을 순서대로

## 2. 프롬프트

- [x] 2.1 `MealAnalysisPrompt` — 직전 추정을 항목별 한 줄 목록으로 (D3)
- [x] 2.2 "언급되지 않은 항목은 그대로 두세요" 지시를 넣는다. 이게 없으면 손대지 않은 항목이 회차마다 흔들린다
- [x] 2.3 설명을 목록으로 넘긴다(단일 문자열에서 목록으로)
- [x] 2.4 순서는 개인 보정, 직전 추정, 사용자 설명 (D5)
- [x] 2.5 직전 추정이 없으면(최초 분석) 지금과 같은 프롬프트여야 한다 — eval 세트가 그대로 유효해야 한다 (D4)

## 3. 배선

- [x] 3.1 `MealAnalysisService.analyzeImage`·`analyzeText` 시그니처를 목록과 직전 추정을 받도록
- [x] 3.2 `AnalysisWorker` — `job.allNotes()`와 `job.getPreviousResultJson()`을 넘긴다
- [x] 3.3 직전 결과 JSON 파싱 실패는 맥락 없이 진행한다. 재분석 자체가 막히면 안 된다

## 4. 테스트

- [x] 4.1 `reanalyze` 후 직전 결과가 `previousResultJson`으로 옮겨지고 `resultJson`은 비는지
- [x] 4.2 설명이 쌓이는지 — 두 번 재분석하면 둘 다 남는다
- [x] 4.3 프롬프트 조립 — 직전 추정이 있으면 항목 줄과 유지 지시가 들어간다
- [x] 4.4 최초 분석 프롬프트는 변하지 않는다 (D4)
- [x] 4.5 통합 — 재분석 요청이 직전 결과를 담아 모델을 부르는지(OpenAI 목킹, 요청 본문 확인)
- [x] 4.6 깨진 직전 결과 JSON으로도 재분석이 진행되는지

## 5. 마무리

- [x] 5.1 `cd backend && ./gradlew test`
- [ ] 5.2 실제 사진으로 "밥 양 더 줄었어" 확인 — 값이 실제로 줄어드는지
