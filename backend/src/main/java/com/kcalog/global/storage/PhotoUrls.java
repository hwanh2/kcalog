package com.kcalog.global.storage;

/** 사진 프록시 URL 조립을 한 곳에 모은다 — 경로 접두어가 여러 응답 DTO에 흩어지지 않게. */
public final class PhotoUrls {

    /** 프록시 경로 접두어. {@link PhotoController}의 매핑과 일치해야 한다. */
    public static final String PREFIX = "/api/photos/";

    private PhotoUrls() {
    }

    /** key({memberId}/{uuid})를 소유자 한정 프록시 URL로. key가 null이면 null. */
    public static String of(String key) {
        return key != null ? PREFIX + key : null;
    }
}
