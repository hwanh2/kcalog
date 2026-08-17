package com.kcalog.domain.feedback.controller;

import com.kcalog.domain.feedback.dto.FeedbackResponse;
import com.kcalog.domain.feedback.dto.SendFeedbackRequest;
import com.kcalog.domain.feedback.service.FeedbackService;
import com.kcalog.global.common.LoginMemberId;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/feedback")
@RequiredArgsConstructor
public class FeedbackController {

    private final FeedbackService feedbackService;

    /** 기기 정보는 헤더에서 읽는다 — 본문으로 받으면 화면마다 빠뜨리고 값도 마음대로 적힌다 */
    @PostMapping
    public FeedbackResponse send(@LoginMemberId Long memberId,
                                 @Valid @RequestBody SendFeedbackRequest request,
                                 @RequestHeader(value = HttpHeaders.USER_AGENT, required = false) String userAgent) {
        return feedbackService.send(memberId, request, userAgent);
    }
}
