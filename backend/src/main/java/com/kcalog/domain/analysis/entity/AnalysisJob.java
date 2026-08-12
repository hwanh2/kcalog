package com.kcalog.domain.analysis.entity;

import com.kcalog.global.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 비동기 분석 작업 (design D2). 생성 시 ANALYZING, 워커가 결과에 따라 상태를 전이한다.
 * 입력은 사진·설명 각각 선택이며 최소 하나는 있어야 한다 — 사진 없는 작업(설명만)은 imageKey가 null이다.
 * 사용자 확인 저장은 별도(meal)라 이 엔티티는 meal을 만들지 않는다.
 */
@Entity
@Table(name = "analysis_job")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AnalysisJob extends BaseEntity {

    /** 작업당 재분석 상한 — 각 회차가 실제 LLM 호출이라 무한 재시도를 막는다 */
    public static final int MAX_REANALYSIS = 2;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long memberId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AnalysisStatus status;

    // 사진 없는 작업(설명만)이면 null
    @Column(name = "image_key")
    private String imageKey;

    // 사진에 보이지 않는 정보를 담은 사용자 설명. 재분석 시 최신 설명으로 갱신된다
    @Column(length = 500)
    private String note;

    @Column(name = "reanalysis_count", nullable = false)
    private int reanalysisCount;

    @Column(name = "result_json")
    private String resultJson;

    @Column(name = "error_code")
    private String errorCode;

    private AnalysisJob(Long memberId, String imageKey, String note) {
        this.memberId = memberId;
        this.imageKey = imageKey;
        this.note = note;
        this.status = AnalysisStatus.ANALYZING;
    }

    /** 분석 대기 상태로 생성 — imageKey·note 중 최소 하나가 있어야 한다(컨트롤러가 검증) */
    public static AnalysisJob analyzing(Long memberId, String imageKey, String note) {
        return new AnalysisJob(memberId, imageKey, note);
    }

    /** 음식이 있는 분석 결과로 완료 */
    public void complete(String resultJson) {
        this.status = AnalysisStatus.COMPLETED;
        this.resultJson = resultJson;
    }

    /** 음식 미검출 — 결과(안내 포함)를 담고 NO_FOOD로 */
    public void noFood(String resultJson) {
        this.status = AnalysisStatus.NO_FOOD;
        this.resultJson = resultJson;
    }

    /** 분석 실패 — 사유 코드와 함께 FAILED로 */
    public void fail(String errorCode) {
        this.status = AnalysisStatus.FAILED;
        this.errorCode = errorCode;
    }

    public boolean hasImage() {
        return imageKey != null;
    }

    public boolean canReanalyze() {
        return reanalysisCount < MAX_REANALYSIS;
    }

    /**
     * 설명을 덧붙여 다시 분석 — 같은 작업을 ANALYZING으로 되돌리고 이전 결과를 비운다.
     * 사진은 그대로 재사용한다(재업로드하지 않는다).
     */
    public void reanalyze(String note) {
        this.note = note;
        this.reanalysisCount++;
        this.status = AnalysisStatus.ANALYZING;
        this.resultJson = null;
        this.errorCode = null;
    }

    public boolean isOwnedBy(Long memberId) {
        return this.memberId.equals(memberId);
    }
}
