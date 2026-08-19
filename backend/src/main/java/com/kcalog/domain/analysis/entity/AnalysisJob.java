package com.kcalog.domain.analysis.entity;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
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

import java.util.ArrayList;
import java.util.List;

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

    /** 설명 이력 직렬화 전용. 프레임워크 빈에 의존하지 않는다(프로젝트 관례) */
    private static final ObjectMapper NOTES_MAPPER = new ObjectMapper();

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

    // 사진에 보이지 않는 정보를 담은 사용자의 **최초** 설명. 재분석 때 덧붙인 것은 reanalysisNotes로 쌓인다
    @Column(length = 500)
    private String note;

    // 재분석마다 덧붙인 설명(JSON 배열). 최신 것만 남기면 모델이 흘린 지시가 영영 사라진다(design D2)
    @Column(name = "reanalysis_notes")
    private String reanalysisNotes;

    // 직전 회차의 추정. "이거보다 더 적어요" 같은 상대적인 말의 기준이 된다(design D1)
    @Column(name = "previous_result_json")
    private String previousResultJson;

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
     * 설명을 덧붙여 다시 분석. 같은 작업을 ANALYZING으로 되돌린다. 사진은 그대로 재사용한다.
     * <p>
     * 직전 결과는 지우지 않고 {@code previousResultJson}으로 옮긴다. 다음 회차의 기준이 되기 때문이다.
     * {@code resultJson}을 비우는 것은 유지한다. 상태가 ANALYZING인데 결과가 남아 있으면
     * 폴링하는 화면이 낡은 값을 새 결과로 착각한다(design D1).
     */
    public void reanalyze(String note) {
        this.previousResultJson = this.resultJson;
        this.reanalysisNotes = appendNote(note);
        this.reanalysisCount++;
        this.status = AnalysisStatus.ANALYZING;
        this.resultJson = null;
        this.errorCode = null;
    }

    /** 지금까지의 설명 전부 — 최초 설명이 맨 앞이고 덧붙인 순서대로 이어진다 */
    public List<String> allNotes() {
        List<String> all = new ArrayList<>();
        if (note != null && !note.isBlank()) {
            all.add(note);
        }
        all.addAll(readNotes());
        return all;
    }

    /**
     * 줄바꿈으로 이어 붙이지 않고 JSON 배열로 쌓는다. 사용자가 설명에 줄바꿈을 넣으면
     * 구분자가 깨져 한 설명이 둘로 쪼개진다(design D2).
     */
    private String appendNote(String added) {
        List<String> notes = new ArrayList<>(readNotes());
        notes.add(added);
        try {
            return NOTES_MAPPER.writeValueAsString(notes);
        } catch (JsonProcessingException e) {
            // 쓰기가 실패해도 재분석 자체는 진행돼야 한다. 이번 설명만 남긴다
            return null;
        }
    }

    private List<String> readNotes() {
        if (reanalysisNotes == null || reanalysisNotes.isBlank()) {
            return List.of();
        }
        try {
            return NOTES_MAPPER.readValue(reanalysisNotes, new TypeReference<List<String>>() {
            });
        } catch (JsonProcessingException e) {
            return List.of();
        }
    }

    public boolean isOwnedBy(Long memberId) {
        return this.memberId.equals(memberId);
    }
}
