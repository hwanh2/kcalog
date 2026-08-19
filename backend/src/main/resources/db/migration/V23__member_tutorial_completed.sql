-- 앱 둘러보기 안내를 봤는지. 온보딩 완료와 달리 파생시킬 근거가 없어 컬럼으로 둔다 (design D8).
-- 기존 회원은 백필하지 않는다. 다음 접속에 한 번 뜨는 쪽이 맞다.
ALTER TABLE member ADD COLUMN tutorial_completed BOOLEAN NOT NULL DEFAULT FALSE;
