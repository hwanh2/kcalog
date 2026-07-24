package com.kcalog.domain.member.dto;

import com.kcalog.domain.member.entity.ActivityLevel;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import java.math.BigDecimal;

/** 부분 수정 — null인 필드는 변경하지 않는다. 검증 어노테이션은 값이 있을 때만 적용된다. */
public record UpdateMemberRequest(
        @DecimalMin("100") @DecimalMax("230") BigDecimal heightCm,
        @DecimalMin("30") @DecimalMax("250") BigDecimal targetWeightKg,
        ActivityLevel activityLevel,
        @Min(800) @Max(10000) Integer dailyKcalTarget
) {
}
