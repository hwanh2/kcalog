package com.kcalog.domain.member.dto;

import com.kcalog.domain.member.entity.ActivityLevel;
import com.kcalog.domain.member.entity.Gender;
import com.kcalog.domain.member.entity.Goal;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

import static com.kcalog.domain.member.dto.MemberValidation.BIRTH_YEAR_MIN;
import static com.kcalog.domain.member.dto.MemberValidation.DAILY_KCAL_MAX;
import static com.kcalog.domain.member.dto.MemberValidation.DAILY_KCAL_MIN;
import static com.kcalog.domain.member.dto.MemberValidation.HEIGHT_CM_MAX;
import static com.kcalog.domain.member.dto.MemberValidation.HEIGHT_CM_MIN;
import static com.kcalog.domain.member.dto.MemberValidation.WEIGHT_KG_MAX;
import static com.kcalog.domain.member.dto.MemberValidation.WEIGHT_KG_MIN;

public record OnboardingRequest(
        @NotNull Gender gender,
        @NotNull @Min(BIRTH_YEAR_MIN) Integer birthYear,
        @NotNull @DecimalMin(HEIGHT_CM_MIN) @DecimalMax(HEIGHT_CM_MAX) BigDecimal heightCm,
        @NotNull @DecimalMin(WEIGHT_KG_MIN) @DecimalMax(WEIGHT_KG_MAX) BigDecimal weightKg,
        // 선택 — 감량·증량을 고른 회원만 입력한다(체중 탭 목표 달성 예상용)
        @DecimalMin(WEIGHT_KG_MIN) @DecimalMax(WEIGHT_KG_MAX) BigDecimal targetWeightKg,
        @NotNull ActivityLevel activityLevel,
        @NotNull Goal goal,
        // 제안값을 사용자가 수정해 확정한 최종 목표
        @NotNull @Min(DAILY_KCAL_MIN) @Max(DAILY_KCAL_MAX) Integer dailyKcalTarget
) {
}
