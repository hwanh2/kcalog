package com.kcalog.domain.coaching.entity;

import lombok.Getter;

/**
 * 칭찬 종류와 표시 우선순위(작을수록 먼저).
 * <p>
 * 한 번에 하나만 보여주므로 순서가 필요하다. 하루 목표가 가장 뒤인 이유는 잘 지키는 회원에게
 * 매일 생겨 이정표를 가리기 때문이고, 첫걸음이 맨 앞인 이유는 데이터가 거의 없는 초반 회원에게
 * 유일하게 닿는 칭찬이기 때문이다(design D6).
 */
@Getter
public enum PraiseKind {

    FIRST_MEAL(1),
    FIRST_WEIGHT(1),
    MEAL_STREAK(2),
    WEIGHT_TREND(3),
    DAILY_GOAL(4);

    private final int priority;

    PraiseKind(int priority) {
        this.priority = priority;
    }
}
