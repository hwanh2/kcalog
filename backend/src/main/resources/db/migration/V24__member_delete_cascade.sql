-- 회원 탈퇴(add-apps-in-toss D12). 회원을 지우면 그 회원의 모든 기록이 함께 지워져야 한다.
-- 이 세 테이블만 CASCADE 없이 만들어져 있어서, 기록이 하나라도 있으면 회원 삭제가 외래 키에 막혔다.
ALTER TABLE food_correction
    DROP CONSTRAINT food_correction_member_id_fkey,
    ADD CONSTRAINT food_correction_member_id_fkey
        FOREIGN KEY (member_id) REFERENCES member (id) ON DELETE CASCADE;

ALTER TABLE member_favorite_food
    DROP CONSTRAINT member_favorite_food_member_id_fkey,
    ADD CONSTRAINT member_favorite_food_member_id_fkey
        FOREIGN KEY (member_id) REFERENCES member (id) ON DELETE CASCADE;

ALTER TABLE member_favorite_meal
    DROP CONSTRAINT member_favorite_meal_member_id_fkey,
    ADD CONSTRAINT member_favorite_meal_member_id_fkey
        FOREIGN KEY (member_id) REFERENCES member (id) ON DELETE CASCADE;
