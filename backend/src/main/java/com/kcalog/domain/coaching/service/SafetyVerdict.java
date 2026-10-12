package com.kcalog.domain.coaching.service;

public enum SafetyVerdict {
    ALLOW,
    /** 자살, 자해 신호. 조언을 멈추고 위기 상담으로 안내한다 */
    SELF_HARM,
    /** 구토, 약물 등으로 체중을 줄이려는 행동. 식단 앱이라 자해와 맞닿는 지점이다 */
    DISORDERED_EATING,
    /** 그 밖의 금지 내용(폭력, 불법, 선정 등) */
    REFUSE
}
