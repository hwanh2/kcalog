package com.kcalog.domain.weight.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;

import static com.kcalog.domain.member.dto.MemberValidation.WEIGHT_KG_MAX;
import static com.kcalog.domain.member.dto.MemberValidation.WEIGHT_KG_MIN;

/** 체중 기록 입력 — logDate가 null이면 오늘 날짜로 기록한다. 소수 1자리(컬럼 NUMERIC(4,1))까지만 허용 */
public record RecordWeightRequest(
        @NotNull @DecimalMin(WEIGHT_KG_MIN) @DecimalMax(WEIGHT_KG_MAX) @Digits(integer = 3, fraction = 1) BigDecimal weightKg,
        LocalDate logDate
) {
}
