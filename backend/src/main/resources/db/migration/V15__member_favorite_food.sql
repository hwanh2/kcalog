-- 즐겨찾기(나만의 음식 라이브러리) — 카탈로그 항목·AI 분석 결과·직접 입력을 회원별로 보관한다.
-- 저장 단위는 음식 한 개(조합/세트는 지원하지 않는다). 같은 음식 재저장은 최신값 덮어쓰기.
-- 개인 보정치(food_correction)와는 별개다: 즐겨찾기는 "빨리 담기", 보정치는 "AI가 틀렸다"로 목적이 다르다.
CREATE TABLE member_favorite_food (
    id              BIGSERIAL PRIMARY KEY,
    member_id       BIGINT       NOT NULL REFERENCES member (id),
    name            VARCHAR(100) NOT NULL,
    name_normalized VARCHAR(100) NOT NULL,
    emoji           VARCHAR(16),
    quantity        NUMERIC(6, 2) NOT NULL,
    unit            VARCHAR(20)  NOT NULL,
    kcal            INT          NOT NULL,
    carb_g          NUMERIC(5, 1) NOT NULL,
    protein_g       NUMERIC(5, 1) NOT NULL,
    fat_g           NUMERIC(5, 1) NOT NULL,
    created_at      TIMESTAMPTZ  NOT NULL,
    updated_at      TIMESTAMPTZ  NOT NULL,
    CONSTRAINT uq_favorite_food_member_name UNIQUE (member_id, name_normalized)
);
-- member_id 단독 인덱스는 두지 않는다: UNIQUE(member_id, name_normalized)의 선두 컬럼이 member_id라
-- 목록 조회(회원별 전체)도 그 인덱스로 커버된다(leftmost prefix).
