package com.kcalog.domain.member.dto;

import com.kcalog.domain.member.entity.ActivityLevel;
import com.kcalog.domain.member.entity.Gender;
import com.kcalog.domain.member.entity.Goal;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import java.math.BigDecimal;

import static com.kcalog.domain.member.dto.MemberValidation.BIRTH_YEAR_MIN;
import static com.kcalog.domain.member.dto.MemberValidation.DAILY_KCAL_MAX;
import static com.kcalog.domain.member.dto.MemberValidation.DAILY_KCAL_MIN;
import static com.kcalog.domain.member.dto.MemberValidation.HEIGHT_CM_MAX;
import static com.kcalog.domain.member.dto.MemberValidation.HEIGHT_CM_MIN;
import static com.kcalog.domain.member.dto.MemberValidation.WEIGHT_KG_MAX;
import static com.kcalog.domain.member.dto.MemberValidation.WEIGHT_KG_MIN;

/**
 * 부분 수정 — null인 필드는 변경하지 않는다. 검증 어노테이션은 값이 있을 때만 적용된다.
 *
 * 성별·출생연도도 고칠 수 있다: 둘 다 유지칼로리 공식(Mifflin-St Jeor)에 직접 들어가므로,
 * 온보딩에서 잘못 고르면 그 뒤의 모든 계산이 틀어진 채로 남는다.
 * 상한(미래 연도) 검증은 어노테이션으로 낼 수 없어 MemberService가 맡는다.
 */
public record UpdateMemberRequest(
        Gender gender,
        @Min(BIRTH_YEAR_MIN) Integer birthYear,
        @DecimalMin(HEIGHT_CM_MIN) @DecimalMax(HEIGHT_CM_MAX) BigDecimal heightCm,
        @DecimalMin(WEIGHT_KG_MIN) @DecimalMax(WEIGHT_KG_MAX) BigDecimal targetWeightKg,
        ActivityLevel activityLevel,
        Goal goal,
        @Min(DAILY_KCAL_MIN) @Max(DAILY_KCAL_MAX) Integer dailyKcalTarget
) {
}
