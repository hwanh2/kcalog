package com.kcalog.domain.member.dto;

import com.kcalog.domain.member.entity.ActivityLevel;
import com.kcalog.domain.member.entity.Gender;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record OnboardingRequest(
        @NotNull Gender gender,
        @NotNull @Min(1920) Integer birthYear,
        @NotNull @DecimalMin("100") @DecimalMax("230") BigDecimal heightCm,
        @NotNull @DecimalMin("30") @DecimalMax("250") BigDecimal weightKg,
        @NotNull @DecimalMin("30") @DecimalMax("250") BigDecimal targetWeightKg,
        @NotNull ActivityLevel activityLevel,
        // 제안값을 사용자가 수정해 확정한 최종 목표
        @NotNull @Min(800) @Max(10000) Integer dailyKcalTarget
) {
}
