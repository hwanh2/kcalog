-- 끼니 세트 — 음식 여러 개를 이름 붙인 한 덩어리로 보관한다("회사 점심 A").
--
-- meal(먹은 사실)과 분리한 이유: 기록을 지워도 세트는 남아야 하고, 무엇보다 대시보드·리포트가
-- meal을 훑으므로 틀이 섞이면 모든 집계 쿼리가 그것을 걸러야 한다(design D1).
-- 즐겨찾기 음식(member_favorite_food)과도 별개다 — 재사용 단위가 음식이 아니라 조합이다.
CREATE TABLE member_favorite_meal (
    id              BIGSERIAL PRIMARY KEY,
    member_id       BIGINT       NOT NULL REFERENCES member (id),
    name            VARCHAR(100) NOT NULL,
    name_normalized VARCHAR(100) NOT NULL,
    created_at      TIMESTAMPTZ  NOT NULL,
    updated_at      TIMESTAMPTZ  NOT NULL,
    -- 같은 이름 재저장은 덮어쓰기. 판정은 즐겨찾기 음식과 같은 FoodNames.normalize를 쓴다 —
    -- 규칙이 갈리면 "저장했는데 또 생긴다"가 된다(design D3)
    CONSTRAINT uq_favorite_meal_member_name UNIQUE (member_id, name_normalized)
);
-- member_id 단독 인덱스는 두지 않는다: 위 UNIQUE의 선두 컬럼이 member_id라 목록 조회도 커버된다.

-- 세트에 든 음식 — meal_item과 컬럼이 거의 같지만 의미가 다른 개념이라 상속으로 묶지 않았다(design D1).
-- 영양값은 quantity·unit이 이미 반영된 총량이다(meal_item과 동일 규칙).
CREATE TABLE member_favorite_meal_item (
    id                BIGSERIAL PRIMARY KEY,
    favorite_meal_id  BIGINT        NOT NULL REFERENCES member_favorite_meal (id) ON DELETE CASCADE,
    name              VARCHAR(100)  NOT NULL,
    quantity          NUMERIC(6, 2) NOT NULL,
    unit              VARCHAR(20)   NOT NULL,
    kcal              INTEGER       NOT NULL,
    carb_g            NUMERIC(5, 1) NOT NULL,
    protein_g         NUMERIC(5, 1) NOT NULL,
    fat_g             NUMERIC(5, 1) NOT NULL,
    -- 저장할 때의 순서를 그대로 보여주기 위한 것. 사진 속 배치 순서가 곧 상 차림 순서다
    sort_order        INTEGER       NOT NULL
);

CREATE INDEX idx_favorite_meal_item_meal ON member_favorite_meal_item (favorite_meal_id);
