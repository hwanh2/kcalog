-- 목표 방향(CUT/MAINTAIN/BULK) — 목표 체중이 없어도 일일 칼로리 목표를 낼 수 있게 하는 기준.
-- 온보딩에서 목표 체중이 선택 항목이 되면서, 방향을 명시적으로 저장한다.
-- nullable: 방향이 없는 기존 회원은 목표 체중과 현재 체중 비교로 폴백한다.
ALTER TABLE member ADD COLUMN goal VARCHAR(10);
