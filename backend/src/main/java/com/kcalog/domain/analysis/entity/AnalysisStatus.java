package com.kcalog.domain.analysis.entity;

/** 분석 작업 상태 — ANALYZING(진행) → COMPLETED(음식 있음)·NO_FOOD(음식 없음)·FAILED(오류) */
public enum AnalysisStatus {
    ANALYZING,
    COMPLETED,
    NO_FOOD,
    FAILED
}
