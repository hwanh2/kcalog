-- 확정 식사에 연결된 사진 key. 수동 입력·구 기록은 NULL. 분석 확인 저장 시 작업의 사진을 복사한다.
ALTER TABLE meal ADD COLUMN image_key VARCHAR(255);
