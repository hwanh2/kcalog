# 태스크

## 1. 백엔드

- [x] 1.1 `V19__feedback.sql` — member 참조는 `ON DELETE CASCADE` (D7). 회원별·최신순 조회용 인덱스
- [x] 1.2 `Feedback` 엔티티 — 보낸 뒤 바뀌지 않으므로 상태 변경 메서드 없음. 정적 팩토리 `of`
- [x] 1.3 `SendFeedbackRequest` — `@NotBlank` + 2000자. **기기 정보는 본문으로 받지 않는다** (D2)
- [x] 1.4 `FeedbackResponse` — id·createdAt만. 보낸 글을 되돌려주지 않는다 (D4)
- [x] 1.5 `FeedbackService` — 최근 24시간 10건 상한, 앞뒤 공백 제거, 기기 문자열 500자 자르기 (D3)
- [x] 1.6 `FeedbackController` — 기기 정보는 `@RequestHeader(USER_AGENT)`
- [x] 1.7 `FeedbackRateLimitException` → 429 (analysis·coaching과 같은 방식)

## 2. 프론트

- [x] 2.1 `api/feedback` — 상한 상수를 서버와 같은 값(2000)으로 둔다. 화면에서 먼저 막기 위해
- [x] 2.2 `FeedbackSheet` — 입력·글자 수·보내는 정보 안내·보낸 뒤 확인
- [x] 2.3 실패해도 적은 내용을 지우지 않는다 — 지우면 처음부터 다시 써야 한다
- [x] 2.4 답장을 약속하지 않는다 — 알림 경로가 없어 지킬 수 없는 말이다 (D5)
- [x] 2.4a "앱 버전과 기기 정보가 함께 전달돼요" 안내를 **뺀다**(요청). 저장하는 것은 그대로이고,
      스펙의 "밝힌다(MUST)"도 "맥락을 함께 저장한다"로 고쳐 코드와 어긋나지 않게 했다 (D6)
- [x] 2.5 프로필 메뉴 교체 — 깃허브 이슈 링크를 없애고 "의견 보내기"로. **"도움말"은 함께 뗀다** (D6)

## 3. 마무리

- [x] 3.1 백엔드 통합 테스트 6개 — 저장·빈 내용·길이 초과·비로그인·도배·회원별 상한
- [x] 3.2 프론트 테스트 5개 — 전송 값·빈 내용·상한·보낸 뒤·실패 시 내용 보존
- [x] 3.3 **마이그레이션 번호 충돌 수정** — `V10`이 이미 있었다(`V10__food_correction`). 사전순 `ls`에서
      가려져 못 봤다. `V19`로 옮김. 테스트가 기동 실패로 잡았다
- [x] 3.4 `./gradlew test` · `npm test` · `npm run build` · `openspec validate --strict` 통과
## 4. 메일 알림

- [x] 4.1 `spring-boot-starter-mail` 추가 · `spring.mail.*`(STARTTLS·타임아웃) · `app.feedback.mail-to`
- [x] 4.2 `FeedbackSubmittedEvent` — 엔티티가 아니라 값을 싣는다. 커밋 뒤 다른 스레드라 컨텍스트가 닫혀 있다 (D9)
- [x] 4.3 `FeedbackMailNotifier` — `AFTER_COMMIT` + `@Async`. 같은 트랜잭션에서 보내면 회원이 묶이고,
      실패 시 롤백되어 의견이 사라진다
- [x] 4.4 발송 실패는 삼키고 `log.error`만 — 요청은 이미 응답을 돌려줬다
- [x] 4.5 설정이 없으면 조용히 건너뛴다. `JavaMailSender`는 `ObjectProvider`로 받는다 (D10)
- [x] 4.6 **헬스체크에서 메일 제외** — 스타터가 SMTP를 헬스에 끼워 넣어 `/actuator/health`가 DOWN이 됐다.
      기존 테스트 2개가 잡았다 (D11)
- [x] 4.7 `AppProperties`에 `Feedback` 추가 — 레코드라 테스트 호출부 4곳에 인자를 채웠다
- [x] 4.8 배포 경로에 시크릿 4개(`MAIL_HOST`·`MAIL_USERNAME`·`MAIL_PASSWORD`·`FEEDBACK_TO`) · `.env.example` 문서화
- [x] 4.9 알림에 **보낸 사람 이름·이메일** — 회원 번호만으로는 누구인지 매번 DB를 뒤져야 한다.
      이메일은 `Reply-To`로도 세워 메일에서 바로 답장이 되게. feedback 행에는 복사하지 않는다 (D9)
- [x] 4.10 테스트 8개 — 발송 내용·받는 주소 없음·발송기 없음·실패 삼킴·본문 축약·보내는 주소 지정 · SMTP 없이도 저장

## 5. 마무리

- [ ] 5.1 **GitHub Secrets 등록** — 2단계 인증 → 앱 비밀번호 발급 → `MAIL_HOST=smtp.gmail.com`,
      `MAIL_USERNAME`, `MAIL_PASSWORD`(앱 비밀번호), `FEEDBACK_TO`. 넣기 전까지는 저장만 되고 발송은 건너뛴다
- [ ] 5.2 **배포 후 실제 메일 도착 확인** — 앱에서 의견을 하나 보내보고 받은편지함과
      `docker logs kcalog-backend | grep "의견 알림"`을 함께 본다
