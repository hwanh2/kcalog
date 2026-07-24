package com.kcalog.domain.member.dto;

import com.kcalog.domain.member.entity.ActivityLevel;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import java.math.BigDecimal;

import static com.kcalog.domain.member.dto.MemberValidation.DAILY_KCAL_MAX;
import static com.kcalog.domain.member.dto.MemberValidation.DAILY_KCAL_MIN;
import static com.kcalog.domain.member.dto.MemberValidation.HEIGHT_CM_MAX;
import static com.kcalog.domain.member.dto.MemberValidation.HEIGHT_CM_MIN;
import static com.kcalog.domain.member.dto.MemberValidation.WEIGHT_KG_MAX;
import static com.kcalog.domain.member.dto.MemberValidation.WEIGHT_KG_MIN;

/** 부분 수정 — null인 필드는 변경하지 않는다. 검증 어노테이션은 값이 있을 때만 적용된다. */
public record UpdateMemberRequest(
        @DecimalMin(HEIGHT_CM_MIN) @DecimalMax(HEIGHT_CM_MAX) BigDecimal heightCm,
        @DecimalMin(WEIGHT_KG_MIN) @DecimalMax(WEIGHT_KG_MAX) BigDecimal targetWeightKg,
        ActivityLevel activityLevel,
        @Min(DAILY_KCAL_MIN) @Max(DAILY_KCAL_MAX) Integer dailyKcalTarget
) {
}
