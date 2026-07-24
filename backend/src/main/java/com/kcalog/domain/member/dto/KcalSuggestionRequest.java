package com.kcalog.domain.member.dto;

import com.kcalog.domain.member.entity.ActivityLevel;
import com.kcalog.domain.member.entity.Gender;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

import static com.kcalog.domain.member.dto.MemberValidation.BIRTH_YEAR_MIN;
import static com.kcalog.domain.member.dto.MemberValidation.HEIGHT_CM_MAX;
import static com.kcalog.domain.member.dto.MemberValidation.HEIGHT_CM_MIN;
import static com.kcalog.domain.member.dto.MemberValidation.WEIGHT_KG_MAX;
import static com.kcalog.domain.member.dto.MemberValidation.WEIGHT_KG_MIN;

/** 제안 칼로리 계산 입력 (온보딩·프로필 수정 화면 공용, 쿼리 파라미터 바인딩). 미래 출생연도는 서비스에서 차단 */
public record KcalSuggestionRequest(
        @NotNull Gender gender,
        @NotNull @Min(BIRTH_YEAR_MIN) Integer birthYear,
        @NotNull @DecimalMin(HEIGHT_CM_MIN) @DecimalMax(HEIGHT_CM_MAX) BigDecimal heightCm,
        @NotNull @DecimalMin(WEIGHT_KG_MIN) @DecimalMax(WEIGHT_KG_MAX) BigDecimal weightKg,
        @NotNull @DecimalMin(WEIGHT_KG_MIN) @DecimalMax(WEIGHT_KG_MAX) BigDecimal targetWeightKg,
        @NotNull ActivityLevel activityLevel
) {
}
