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

    /** 선택 항목 — 감량·증량을 고른 회원만 입력한다(체중 탭 목표 달성 예상용) */
    private BigDecimal targetWeightKg;

    /** 목표 방향 — 목표 체중이 없어도 목표 칼로리를 낼 수 있게 하는 기준 */
    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private Goal goal;

    private Integer dailyKcalTarget;

    /**
     * 근육량 목표 여부. 탄단지 목표의 비율을 가른다.
     * goal은 체중이 어느 방향으로 갈지이고, 이 값은 그 체중을 근육으로 채우고 싶은지다.
     * activityLevel도 아니다. 이미 유지칼로리에 계수로 곱해져 있어 여기에 다시 쓰면 두 번 반영된다.
     */
    @Column(nullable = false)
    private boolean muscleGoal;

    public static Member signUp(Provider provider, String providerId, String email, String nickname) {
        Member member = new Member();
        member.provider = provider;
        member.providerId = providerId;
        member.email = email;
        member.nickname = nickname;
        return member;
    }

    /** 온보딩 제출: 프로필과 목표 방향, 확정된 일일 칼로리 목표를 저장한다. 목표 체중은 선택(null 허용) */
    public void completeOnboarding(Gender gender, int birthYear, BigDecimal heightCm, ActivityLevel activityLevel,
                                   Goal goal, BigDecimal targetWeightKg, int dailyKcalTarget,
                                   boolean muscleGoal) {
        this.gender = gender;
        this.birthYear = birthYear;
        this.heightCm = heightCm;
        this.activityLevel = activityLevel;
        this.goal = goal;
        this.targetWeightKg = targetWeightKg;
        this.dailyKcalTarget = dailyKcalTarget;
        this.muscleGoal = muscleGoal;
    }

    /** 프로필 수정: null이 아닌 필드만 반영한다 */
    public void updateProfile(Gender gender, Integer birthYear, BigDecimal heightCm, ActivityLevel activityLevel,
                              Goal goal, BigDecimal targetWeightKg, Integer dailyKcalTarget) {
        if (gender != null) {
            this.gender = gender;
        }
        if (birthYear != null) {
            this.birthYear = birthYear;
        }
        if (heightCm != null) {
            this.heightCm = heightCm;
        }
        if (activityLevel != null) {
            this.activityLevel = activityLevel;
        }
        if (goal != null) {
            this.goal = goal;
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
