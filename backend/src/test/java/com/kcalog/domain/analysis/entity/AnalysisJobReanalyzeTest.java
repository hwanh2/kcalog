package com.kcalog.domain.analysis.entity;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 재분석이 직전 맥락을 잃지 않는지 고정한다.
 * <p>
 * 예전에는 새 설명이 이전 설명을 덮고 직전 결과를 지웠다. 그래서 "밥 양 더 줄었어" 같은 말이
 * 기준을 잃고, 앞서 말한 "고기는 뺐어"가 사라졌다.
 */
@DisplayName("재분석 맥락")
class AnalysisJobReanalyzeTest {

    private static final String RESULT = """
            {"foodFound":true,"items":[],"overallConfidence":0.8,"notes":""}""";

    private static AnalysisJob completed(String note) {
        AnalysisJob job = AnalysisJob.analyzing(1L, "photo-key", note);
        job.complete(RESULT);
        return job;
    }

    @Test
    @DisplayName("직전 결과를 지우지 않고 옮긴다")
    void keepsPreviousResult() {
        AnalysisJob job = completed("처음 설명");

        job.reanalyze("고기는 뺐어");

        assertThat(job.getPreviousResultJson()).isEqualTo(RESULT);
        assertThat(job.getResultJson()).isNull(); // 폴링 화면이 낡은 값을 새 결과로 읽지 않게
        assertThat(job.getStatus()).isEqualTo(AnalysisStatus.ANALYZING);
    }

    @Test
    @DisplayName("설명이 쌓인다, 최초 설명이 맨 앞이고 덧붙인 순서대로 이어진다")
    void accumulatesNotes() {
        AnalysisJob job = completed("처음 설명");

        job.reanalyze("고기는 뺐어");
        job.complete(RESULT);
        job.reanalyze("밥도 적어");

        assertThat(job.allNotes()).containsExactly("처음 설명", "고기는 뺐어", "밥도 적어");
    }

    @Test
    @DisplayName("최초 설명이 없으면 덧붙인 것만 남는다")
    void withoutInitialNote() {
        AnalysisJob job = completed(null);

        job.reanalyze("고기는 뺐어");

        assertThat(job.allNotes()).containsExactly("고기는 뺐어");
    }

    @Test
    @DisplayName("줄바꿈이 든 설명도 한 덩어리로 남는다, 구분자로 이어 붙이면 쪼개진다")
    void noteWithNewline() {
        AnalysisJob job = completed(null);

        job.reanalyze("고기는 뺐어\n밥도 적어");

        assertThat(job.allNotes()).containsExactly("고기는 뺐어\n밥도 적어");
    }

    @Test
    @DisplayName("분석 전에는 넘길 맥락이 없다")
    void freshJobHasNoContext() {
        AnalysisJob job = AnalysisJob.analyzing(1L, "photo-key", "처음 설명");

        assertThat(job.getPreviousResultJson()).isNull();
        assertThat(job.allNotes()).isEqualTo(List.of("처음 설명"));
    }

    @Test
    @DisplayName("재분석 횟수는 그대로 센다")
    void countsReanalysis() {
        AnalysisJob job = completed(null);

        job.reanalyze("한 번");
        job.complete(RESULT);
        job.reanalyze("두 번");

        assertThat(job.canReanalyze()).isFalse();
    }
}
