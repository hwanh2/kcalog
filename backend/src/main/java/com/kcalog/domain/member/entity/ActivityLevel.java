package com.kcalog.domain.member.entity;

/** 활동량 — Mifflin-St Jeor BMR에 곱하는 활동계수. 온보딩 4단계 선택지와 1:1 대응한다. */
public enum ActivityLevel {
    LOW(1.2), MID(1.5), HIGH(1.75), VERY_HIGH(1.9);

    private final double factor;

    ActivityLevel(double factor) {
        this.factor = factor;
    }

    public double factor() {
        return factor;
    }
}
