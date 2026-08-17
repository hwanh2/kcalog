package com.kcalog.domain.feedback.dto;

import com.kcalog.domain.feedback.entity.Feedback;

import java.time.Instant;

/**
 * 받았다는 확인만 돌려준다. 내용을 되돌려주지 않는 이유는 화면이 이미 갖고 있어서다 —
 * 굳이 실어 보내면 같은 글이 두 번 오간다.
 */
public record FeedbackResponse(Long id, Instant createdAt) {

    public static FeedbackResponse of(Feedback feedback) {
        return new FeedbackResponse(feedback.getId(), feedback.getCreatedAt());
    }
}
