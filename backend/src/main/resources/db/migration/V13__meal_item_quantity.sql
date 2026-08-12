-- 음식 항목의 섭취량 — "삶은달걀 2개", "현미밥 150g" 처럼 표시·재편집하기 위한 메타.
-- 영양값(kcal·탄단지)은 이미 수량이 반영된 총량이므로 합계 계산은 그대로다.
-- 수량 개념이 없는 기존 기록·직접 입력 항목이 있으므로 nullable.
ALTER TABLE meal_item
    ADD COLUMN quantity NUMERIC(6, 2),
    ADD COLUMN unit     VARCHAR(20);
