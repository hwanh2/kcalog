package com.kcalog.domain.coaching.entity;

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

/** 대화형 코칭 히스토리 한 턴 — 회원별 시간순. 초기화는 회원 것 전체 삭제. */
@Entity
@Table(name = "coaching_chat_message")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CoachingChatMessage extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long memberId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ChatRole role;

    @Column(nullable = false, columnDefinition = "text")
    private String content;

    private CoachingChatMessage(Long memberId, ChatRole role, String content) {
        this.memberId = memberId;
        this.role = role;
        this.content = content;
    }

    public static CoachingChatMessage of(Long memberId, ChatRole role, String content) {
        return new CoachingChatMessage(memberId, role, content);
    }
}
