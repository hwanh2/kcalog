-- 회원 + 프로필 + 현재 목표 (프로필 필드는 온보딩 완료 전까지 null)
CREATE TABLE member (
    id                BIGSERIAL PRIMARY KEY,
    provider          VARCHAR(20)  NOT NULL,
    provider_id       VARCHAR(100) NOT NULL,
    email             VARCHAR(255),
    nickname          VARCHAR(100),
    gender            VARCHAR(10),
    birth_year        INTEGER,
    height_cm         NUMERIC(4, 1),
    activity_level    VARCHAR(10),
    target_weight_kg  NUMERIC(4, 1),
    daily_kcal_target INTEGER,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_member_provider UNIQUE (provider, provider_id)
);

CREATE TABLE refresh_token (
    id         BIGSERIAL PRIMARY KEY,
    member_id  BIGINT      NOT NULL REFERENCES member (id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    -- 회전된 토큰은 삭제하지 않고 revoked 마킹해 보존한다 (재사용 = 탈취 의심 감지, design.md D2)
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_refresh_token_hash UNIQUE (token_hash)
);

CREATE INDEX idx_refresh_token_member ON refresh_token (member_id);

-- 하루 1회 체중 기록, 같은 날 재입력은 upsert
CREATE TABLE weight_log (
    id         BIGSERIAL PRIMARY KEY,
    member_id  BIGINT        NOT NULL REFERENCES member (id) ON DELETE CASCADE,
    log_date   DATE          NOT NULL,
    weight_kg  NUMERIC(4, 1) NOT NULL,
    created_at TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT uq_weight_log_member_date UNIQUE (member_id, log_date)
);
