-- meal.total_* 는 항목(meal_item)들의 합이므로 항목 컬럼보다 넓어야 한다.
-- NUMERIC(5,1)(<=9999.9)은 항목 여러 개 합에서 오버플로 가능 → NUMERIC(6,1)(<=99999.9)로 확장.
-- 항목 개수 상한(@Size 30) × 항목 최대(2000) = 60000 < 99999.9 로 오버플로가 구조적으로 불가능해진다.
ALTER TABLE meal
    ALTER COLUMN carb_g    TYPE NUMERIC(6, 1),
    ALTER COLUMN protein_g TYPE NUMERIC(6, 1),
    ALTER COLUMN fat_g     TYPE NUMERIC(6, 1);
