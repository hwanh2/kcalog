-- 개인 보정치에 기준 섭취량 추가.
-- 보정치의 영양값은 "그때 먹은 양 기준의 총량"인데 지금까지 그 양을 남기지 않아,
-- AI가 다른 양을 찾아내도 저장값을 그대로 갈아끼웠다(달걀 2개 값이 1개에도 적용).
-- base_quantity·unit을 함께 저장해 같은 단위일 때 비례 조정할 수 있게 한다.
-- 기존 행은 NULL — 조정할 근거가 없으므로 종전대로 저장값을 그대로 쓴다.
ALTER TABLE food_correction
    ADD COLUMN base_quantity NUMERIC(6, 2),
    ADD COLUMN unit          VARCHAR(20);
