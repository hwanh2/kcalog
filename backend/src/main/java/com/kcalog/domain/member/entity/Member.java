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

    public static Member signUp(Provider provider, String providerId, String email, String nickname) {
        Member member = new Member();
        member.provider = provider;
        member.providerId = providerId;
        member.email = email;
        member.nickname = nickname;
        return member;
    }
}
