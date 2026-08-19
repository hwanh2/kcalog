-- 재분석이 직전 맥락을 잃지 않게 두 가지를 남긴다.
--   previous_result_json: 직전 회차의 추정 결과. "이거보다 더 적어요" 같은 말의 기준이 된다
--   reanalysis_notes:     재분석마다 덧붙인 설명(JSON 배열). 최신 것만 남기면 지난 지시가 사라진다
--
-- note 컬럼은 그대로 두고 뜻만 "최초 설명"으로 좁힌다. 뜻을 바꿔 이력을 담으면
-- 배포를 되돌렸을 때 옛 코드가 최초 설명 자리에서 JSON을 읽는다.
ALTER TABLE analysis_job
    ADD COLUMN previous_result_json TEXT,
    ADD COLUMN reanalysis_notes     TEXT;
