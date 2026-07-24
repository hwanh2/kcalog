-- BaseEntity 공통 시각 필드 통일: weight_log에 updated_at 추가 (같은 날 재기록 upsert 시 갱신됨)
ALTER TABLE weight_log ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
