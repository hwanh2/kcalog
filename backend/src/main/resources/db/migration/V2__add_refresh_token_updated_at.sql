-- BaseEntity 공통 시각 필드 통일: refresh_token에 updated_at 추가 (revoke 마킹 시 갱신됨)
ALTER TABLE refresh_token ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
