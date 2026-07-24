package com.kcalog.domain.member.dto;

/** 프로필 입력 검증 경계값의 단일 출처 — 온보딩·제안·수정 DTO가 공유한다 */
public final class MemberValidation {

    public static final String HEIGHT_CM_MIN = "100";
    public static final String HEIGHT_CM_MAX = "230";
    public static final String WEIGHT_KG_MIN = "30";
    public static final String WEIGHT_KG_MAX = "250";
    public static final long BIRTH_YEAR_MIN = 1920;
    public static final long DAILY_KCAL_MIN = 800;
    public static final long DAILY_KCAL_MAX = 10_000;

    private MemberValidation() {
    }
}
