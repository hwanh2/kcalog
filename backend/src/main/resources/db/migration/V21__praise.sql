-- 코치가 건네는 칭찬. 사건 감지는 규칙이, 문구는 LLM이 만들고 여기 저장한다.
-- 문구를 저장하는 이유: 말풍선이 즉시 떠야 하는데 LLM을 기다리면 화면이 바뀐 뒤에 뜬다.
CREATE TABLE praise (
    id           BIGSERIAL    PRIMARY KEY,
    member_id    BIGINT       NOT NULL REFERENCES member (id) ON DELETE CASCADE,
    kind         VARCHAR(30)  NOT NULL,
    -- 같은 일을 두 번 칭찬하지 않기 위한 키. meal-streak:7, daily-goal:2026-08-19 같은 형태
    dedupe_key   VARCHAR(60)  NOT NULL,
    message      VARCHAR(200) NOT NULL,
    -- LLM(생성) | RULE(생성 실패로 규칙 문구 사용). 실패한 것도 저장해야 재시도가 되풀이되지 않는다
    source       VARCHAR(20)  NOT NULL,
    -- 읽은 시각. NULL이면 아직 안 읽음
    dismissed_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ  NOT NULL,
    updated_at   TIMESTAMPTZ  NOT NULL,
    -- 판정 코드만으로는 동시 요청 둘이 같은 칭찬을 두 번 만든다. DB가 막는다
    CONSTRAINT uq_praise_member_key UNIQUE (member_id, dedupe_key)
);

-- 조회는 늘 "안 읽은 것"만 본다. 읽은 것까지 담으면 인덱스가 계속 자란다
CREATE INDEX idx_praise_member_pending ON praise (member_id, created_at)
    WHERE dismissed_at IS NULL;
