-- AI PT 코칭 (차별점 #3: 데이터 기반 개인 코칭)
-- 하이브리드 — 숫자는 규칙이 계산(리포트 신호·TDEE·체중 추세), 서술만 LLM이. 비용 때문에 LLM 산출물만 영속.

-- 오늘의 브리핑: 회원당 하루 1개(coach_date 유니크). 첫 조회 시 지연 생성·캐시.
-- signals_json은 생성 근거 스냅샷, recommendations_json은 오늘의 추천 배열. source=LLM|FALLBACK.
CREATE TABLE coaching_message (
    id                   BIGSERIAL PRIMARY KEY,
    member_id            BIGINT       NOT NULL REFERENCES member (id) ON DELETE CASCADE,
    coach_date           DATE         NOT NULL,
    headline             VARCHAR(200) NOT NULL,
    message              TEXT         NOT NULL,
    recommendations_json TEXT         NOT NULL,
    signals_json         TEXT         NOT NULL,
    source               VARCHAR(20)  NOT NULL,
    created_at           TIMESTAMPTZ  NOT NULL,
    updated_at           TIMESTAMPTZ  NOT NULL,
    CONSTRAINT uq_coaching_message_member_date UNIQUE (member_id, coach_date)
);

-- 대화형 코칭 히스토리: 회원별 턴을 시간순 저장. 초기화는 회원 것 전체 삭제.
-- member_id 단독 인덱스는 두지 않는다: 아래 복합 인덱스 선두가 member_id라 조회를 커버(leftmost prefix).
CREATE TABLE coaching_chat_message (
    id         BIGSERIAL PRIMARY KEY,
    member_id  BIGINT      NOT NULL REFERENCES member (id) ON DELETE CASCADE,
    role       VARCHAR(20) NOT NULL,
    content    TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_coaching_chat_member_created ON coaching_chat_message (member_id, created_at);

-- 채팅 일일 사용 카운터 — LLM 비용 가드레일. 초기화가 리셋하지 않아 우회 불가(analysis_usage와 동일 패턴).
CREATE TABLE coaching_chat_usage (
    member_id  BIGINT  NOT NULL REFERENCES member (id) ON DELETE CASCADE,
    usage_date DATE    NOT NULL,
    call_count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (member_id, usage_date)
);
