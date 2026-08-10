-- 비동기 사진 분석 작업 — 사용자 확인 전 분석 상태·결과를 담는다 (meal은 확정 시에만 생성).
-- status: ANALYZING → COMPLETED | NO_FOOD | FAILED. result_json은 완료/미검출 시 분석 응답 JSON.
CREATE TABLE analysis_job (
    id          BIGSERIAL PRIMARY KEY,
    member_id   BIGINT       NOT NULL REFERENCES member (id) ON DELETE CASCADE,
    status      VARCHAR(20)  NOT NULL,
    image_key   VARCHAR(255) NOT NULL,        -- 스토리지 key ({memberId}/{uuid})
    result_json TEXT,                          -- COMPLETED/NO_FOOD 시 MealAnalysisResponse JSON
    error_code  VARCHAR(40),                   -- FAILED 시 사유(ANALYSIS_ERROR / INTERRUPTED)
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 소유자별 조회 + 미확인 작업 정리(created_at 기준) 접근 경로
CREATE INDEX idx_analysis_job_member ON analysis_job (member_id);
CREATE INDEX idx_analysis_job_status_created ON analysis_job (status, created_at);
