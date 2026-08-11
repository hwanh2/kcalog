package com.kcalog.domain.coaching.dto;

import com.kcalog.domain.coaching.entity.CoachingChatMessage;

import java.time.Instant;

/** 코칭 대화 한 턴 응답 — role은 "USER"/"ASSISTANT" */
public record CoachingChatMessageResponse(
        Long id,
        String role,
        String content,
        Instant createdAt
) {
    public static CoachingChatMessageResponse from(CoachingChatMessage m) {
        return new CoachingChatMessageResponse(m.getId(), m.getRole().name(), m.getContent(), m.getCreatedAt());
    }
}
