-- 한 끼 식사 기록 — 사진 1장 = 1건, 영양값은 총량(탄단지 분리 아이템은 1차 비범위)
CREATE TABLE meal (
    id          BIGSERIAL PRIMARY KEY,
    member_id   BIGINT       NOT NULL REFERENCES member (id) ON DELETE CASCADE,
    eaten_at    TIMESTAMPTZ  NOT NULL,
    meal_type   VARCHAR(20)  NOT NULL,          -- BREAKFAST / LUNCH / DINNER / SNACK
    source      VARCHAR(10)  NOT NULL,          -- AI / MANUAL
    total_kcal  INTEGER      NOT NULL,
    carb_g      NUMERIC(5, 1) NOT NULL,
    protein_g   NUMERIC(5, 1) NOT NULL,
    fat_g       NUMERIC(5, 1) NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- 날짜별 조회(오늘 대시보드·기록 탭)가 주 접근 경로라 member_id + eaten_at 인덱스
CREATE INDEX idx_meal_member_eaten ON meal (member_id, eaten_at);
