package com.kcalog.domain.feedback.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 의견 보내기.
 *
 * `userAgent`를 받지 않는 이유: 기기 정보는 요청 헤더에 이미 있다. 본문으로 받으면
 * 화면마다 실어 보내는 것을 빠뜨리고, 값도 마음대로 적을 수 있다.
 */
public record SendFeedbackRequest(
        @NotBlank(message = "내용을 입력해주세요.")
        @Size(max = SendFeedbackRequest.CONTENT_MAX, message = "내용은 " + SendFeedbackRequest.CONTENT_MAX + "자까지 쓸 수 있어요.")
        String content,

        /** 보낼 당시 앱 버전. 클라이언트가 아는 값이라 본문으로 받는다 */
        @Size(max = 20)
        String appVersion
) {
    public static final int CONTENT_MAX = 2000;
}
