-- 회원당 일일 AI 분석 호출 횟수 — 비용 가드레일(저장 전 analyze 호출 기준, 실패 호출도 포함)
CREATE TABLE analysis_usage (
    member_id  BIGINT      NOT NULL REFERENCES member (id) ON DELETE CASCADE,
    usage_date DATE        NOT NULL,
    call_count INTEGER     NOT NULL DEFAULT 0,
    PRIMARY KEY (member_id, usage_date)
);
