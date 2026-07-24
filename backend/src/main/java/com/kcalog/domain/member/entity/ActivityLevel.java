package com.kcalog.domain.member.entity;

public enum ActivityLevel {
    LOW(1.2), MID(1.5), HIGH(1.75);

    private final double factor;

    ActivityLevel(double factor) {
        this.factor = factor;
    }

    public double factor() {
        return factor;
    }
}
