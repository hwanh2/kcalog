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
 * 비동기 사진 분석 작업 (design D2). 생성 시 ANALYZING, 워커가 결과에 따라 상태를 전이한다.
 * 사용자 확인 저장은 별도(meal)라 이 엔티티는 meal을 만들지 않는다.
 */
@Entity
@Table(name = "analysis_job")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AnalysisJob extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long memberId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private AnalysisStatus status;

    @Column(name = "image_key", nullable = false)
    private String imageKey;

    @Column(name = "result_json")
    private String resultJson;

    @Column(name = "error_code")
    private String errorCode;

    private AnalysisJob(Long memberId, String imageKey) {
        this.memberId = memberId;
        this.imageKey = imageKey;
        this.status = AnalysisStatus.ANALYZING;
    }

    /** 사진 저장 후 분석 대기 상태로 생성 */
    public static AnalysisJob analyzing(Long memberId, String imageKey) {
        return new AnalysisJob(memberId, imageKey);
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

    public boolean isOwnedBy(Long memberId) {
        return this.memberId.equals(memberId);
    }
}
