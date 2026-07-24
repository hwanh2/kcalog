package com.kcalog.domain.member.dto;

import com.kcalog.domain.member.entity.ActivityLevel;
import com.kcalog.domain.member.entity.Gender;
import com.kcalog.domain.member.entity.Member;

import java.math.BigDecimal;

public record MemberResponse(
        Long id,
        String nickname,
        String email,
        Gender gender,
        Integer birthYear,
        BigDecimal heightCm,
        ActivityLevel activityLevel,
        BigDecimal targetWeightKg,
        Integer dailyKcalTarget,
        BigDecimal latestWeightKg,
        boolean onboardingCompleted
) {
    public static MemberResponse of(Member member, BigDecimal latestWeightKg) {
        return new MemberResponse(
                member.getId(),
                member.getNickname(),
                member.getEmail(),
                member.getGender(),
                member.getBirthYear(),
                member.getHeightCm(),
                member.getActivityLevel(),
                member.getTargetWeightKg(),
                member.getDailyKcalTarget(),
                latestWeightKg,
                member.isOnboardingCompleted());
    }
}
