package com.kcalog.domain.member.entity;

import com.kcalog.global.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * 회원 + 프로필 + 현재 목표.
 * 온보딩(3번 그룹)에서 프로필 필드가 추가된다 — 현재는 인증에 필요한 필드만 매핑.
 */
@Entity
@Table(name = "member")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Member extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Provider provider;

    @Column(name = "provider_id", nullable = false, length = 100)
    private String providerId;

    private String email;

    private String nickname;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private Gender gender;

    private Integer birthYear;

    private BigDecimal heightCm;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private ActivityLevel activityLevel;

    private BigDecimal targetWeightKg;

    private Integer dailyKcalTarget;

    public static Member signUp(Provider provider, String providerId, String email, String nickname) {
        Member member = new Member();
        member.provider = provider;
        member.providerId = providerId;
        member.email = email;
        member.nickname = nickname;
        return member;
    }

    /** 온보딩 제출: 프로필과 확정된 일일 칼로리 목표를 저장한다 */
    public void completeOnboarding(Gender gender, int birthYear, BigDecimal heightCm,
                                   ActivityLevel activityLevel, BigDecimal targetWeightKg, int dailyKcalTarget) {
        this.gender = gender;
        this.birthYear = birthYear;
        this.heightCm = heightCm;
        this.activityLevel = activityLevel;
        this.targetWeightKg = targetWeightKg;
        this.dailyKcalTarget = dailyKcalTarget;
    }

    /** 프로필 수정: null이 아닌 필드만 반영한다 */
    public void updateProfile(BigDecimal heightCm, ActivityLevel activityLevel,
                              BigDecimal targetWeightKg, Integer dailyKcalTarget) {
        if (heightCm != null) {
            this.heightCm = heightCm;
        }
        if (activityLevel != null) {
            this.activityLevel = activityLevel;
        }
        if (targetWeightKg != null) {
            this.targetWeightKg = targetWeightKg;
        }
        if (dailyKcalTarget != null) {
            this.dailyKcalTarget = dailyKcalTarget;
        }
    }

    /** 온보딩 완료 판정 = 일일 칼로리 목표 확정 여부 (design D4) */
    public boolean isOnboardingCompleted() {
        return dailyKcalTarget != null;
    }
}
