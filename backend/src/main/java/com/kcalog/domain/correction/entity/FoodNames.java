package com.kcalog.domain.correction.entity;

/** 음식명 정규화 — 개인 보정치 매칭 키를 만든다. 표기 차이(공백·대소문자)를 흡수한다(design D3). */
public final class FoodNames {

    /**
     * 모든 공백 제거 → 영문 소문자화(한글은 대소문자 없음). 표시 이름은 별도 보존하므로 매칭 키만 공격적으로 정규화한다.
     * 한국어 음식명은 띄어쓰기 불일치가 흔해("김치 찌개" vs "김치찌개") 공백을 통째로 제거해 흡수한다.
     */
    public static String normalize(String name) {
        if (name == null) {
            return "";
        }
        return name.replaceAll("\\s+", "").toLowerCase();
    }

    private FoodNames() {
    }
}
