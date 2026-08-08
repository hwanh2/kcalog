-- 식사 속 음식별 항목 (meal 1:N) — 합계는 meal.total_* 에 비정규화, 위치 박스는 저장하지 않음
CREATE TABLE meal_item (
    id         BIGSERIAL PRIMARY KEY,
    meal_id    BIGINT       NOT NULL REFERENCES meal (id) ON DELETE CASCADE,
    name       VARCHAR(100) NOT NULL,
    kcal       INTEGER      NOT NULL,
    carb_g     NUMERIC(5, 1) NOT NULL,
    protein_g  NUMERIC(5, 1) NOT NULL,
    fat_g      NUMERIC(5, 1) NOT NULL
);

CREATE INDEX idx_meal_item_meal ON meal_item (meal_id);
