-- 회원이 앱 안에서 보낸 의견. 깃허브 이슈로 내보내던 것을 여기로 받는다.
-- 회원이 탈퇴하면 함께 지운다 — 남겨두면 주인 없는 개인 진술이 된다.
CREATE TABLE feedback (
    id          BIGSERIAL   PRIMARY KEY,
    member_id   BIGINT      NOT NULL REFERENCES member (id) ON DELETE CASCADE,
    content     TEXT        NOT NULL,
    -- 어느 화면·기기에서 온 말인지 — 같은 증상을 다시 물어보지 않기 위한 맥락
    app_version VARCHAR(20),
    user_agent  VARCHAR(500),
    created_at  TIMESTAMPTZ NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL
);

-- 최근 것부터 읽고, 회원별 도배 여부를 세는 두 가지 조회를 함께 받는다
CREATE INDEX idx_feedback_member_created ON feedback (member_id, created_at DESC);
