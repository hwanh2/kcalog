package com.kcalog.domain.member.dto;

import com.kcalog.domain.member.entity.ActivityLevel;
import com.kcalog.domain.member.entity.Gender;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

/** 제안 칼로리 계산 입력 (온보딩·프로필 수정 화면 공용, 쿼리 파라미터 바인딩) */
public record KcalSuggestionRequest(
        @NotNull Gender gender,
        @NotNull @Min(1920) Integer birthYear,
        @NotNull @DecimalMin("100") @DecimalMax("230") BigDecimal heightCm,
        @NotNull @DecimalMin("30") @DecimalMax("250") BigDecimal weightKg,
        @NotNull @DecimalMin("30") @DecimalMax("250") BigDecimal targetWeightKg,
        @NotNull ActivityLevel activityLevel
) {
}
