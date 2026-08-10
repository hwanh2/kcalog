-- 개인 영양 보정치 (차별점 #1: 학습형 수정)
-- 사용자가 분석 결과를 정정하고 "기억하기"로 저장하면 음식별 확정 영양값을 회원별로 보관한다.
-- 매칭 키는 정규화된 음식명. 재정정은 최신값으로 덮어쓴다(회원·정규화명 유니크).
CREATE TABLE food_correction (
    id                   BIGSERIAL PRIMARY KEY,
    member_id            BIGINT       NOT NULL REFERENCES member (id),
    food_name_normalized VARCHAR(100) NOT NULL,
    food_name_display    VARCHAR(100) NOT NULL,
    kcal                 INT          NOT NULL,
    carb_g               NUMERIC(5, 1) NOT NULL,
    protein_g            NUMERIC(5, 1) NOT NULL,
    fat_g                NUMERIC(5, 1) NOT NULL,
    created_at           TIMESTAMPTZ  NOT NULL,
    updated_at           TIMESTAMPTZ  NOT NULL,
    CONSTRAINT uq_food_correction_member_name UNIQUE (member_id, food_name_normalized)
);
-- member_id 단독 인덱스는 두지 않는다: UNIQUE(member_id, food_name_normalized)가 만드는 복합 인덱스의
-- 선두 컬럼이 member_id라, member_id 단독 조회(recentFor)도 그 인덱스로 커버된다(leftmost prefix).
