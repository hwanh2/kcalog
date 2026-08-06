package com.kcalog.domain.weight.dto;

import com.kcalog.domain.weight.entity.WeightLog;

import java.math.BigDecimal;
import java.time.LocalDate;

public record WeightResponse(LocalDate logDate, BigDecimal weightKg) {

    public static WeightResponse of(WeightLog log) {
        return new WeightResponse(log.getLogDate(), log.getWeightKg());
    }
}
