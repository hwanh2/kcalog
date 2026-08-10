package com.kcalog.domain.weight.dto;

import java.math.BigDecimal;

/** BMI 값과 아시아-태평양 기준 분류. 신장이 없으면 null(계산하지 않음) */
public record BmiInfo(BigDecimal value, BmiCategory category) {

    public enum BmiCategory {
        UNDERWEIGHT, NORMAL, OVERWEIGHT, OBESE
    }
}
