package com.kcalog.domain.member.entity;

/**
 * 회원이 들어온 경로. 값을 더해도 스키마 변경이 필요 없다(provider는 문자열 컬럼).
 * TOSS는 앱인토스 익명 키로 식별한다. 카카오와 같은 사람이어도 별개 회원이다 (add-apps-in-toss D3).
 */
public enum Provider {
    KAKAO,
    TOSS
}
