package com.kcalog.domain.coaching.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** 코치에게 보내는 질문 */
public record CoachChatRequest(
        @NotBlank(message = "질문을 입력해주세요")
        @Size(max = 500, message = "질문은 500자 이내로 입력해주세요")
        String content
) {
}
