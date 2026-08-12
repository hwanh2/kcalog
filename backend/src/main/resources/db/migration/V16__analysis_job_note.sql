-- 분석 입력 확장 — 사진과 설명(프롬프트)을 각각 선택으로 받는다(최소 하나).
--   image_key NULL 허용: "김밥 한 줄이랑 라면 반 개"처럼 사진 없이 설명만으로 분석하는 경우
--   note: 사진에 보이지 않는 정보(조리법·섭취량·제외한 재료)를 프롬프트에 함께 준다
--   reanalysis_count: 설명을 덧붙인 재분석 횟수. 작업당 2회로 제한한다
ALTER TABLE analysis_job
    ALTER COLUMN image_key DROP NOT NULL;

ALTER TABLE analysis_job
    ADD COLUMN note             VARCHAR(500),
    ADD COLUMN reanalysis_count INT NOT NULL DEFAULT 0;
