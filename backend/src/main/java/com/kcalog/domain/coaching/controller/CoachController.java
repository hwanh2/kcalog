package com.kcalog.domain.coaching.controller;

import com.kcalog.domain.coaching.dto.CoachChatRequest;
import com.kcalog.domain.coaching.dto.CoachingBriefingResponse;
import com.kcalog.domain.coaching.dto.CoachingChatMessageResponse;
import com.kcalog.domain.coaching.dto.PraiseResponse;
import com.kcalog.domain.coaching.service.CoachingService;
import com.kcalog.domain.coaching.service.PraiseService;
import com.kcalog.global.common.LoginMemberId;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

/** AI PT 코칭 — 오늘의 브리핑 + 대화형 Q&A. */
@RestController
@RequestMapping("/api/coach")
@RequiredArgsConstructor
public class CoachController {

    private final CoachingService coachingService;
    private final PraiseService praiseService;

    /** 오늘의 브리핑 — 그날 첫 조회 시 생성·캐시 */
    @GetMapping("/briefing")
    public CoachingBriefingResponse briefing(@LoginMemberId Long memberId) {
        return coachingService.briefing(memberId);
    }

    /** 대화 히스토리 조회 */
    @GetMapping("/messages")
    public List<CoachingChatMessageResponse> messages(@LoginMemberId Long memberId) {
        return coachingService.history(memberId);
    }

    /** 코치에게 질문 — 개인 데이터 기반 응답을 SSE로 스트리밍(token* → done) */
    @PostMapping(value = "/messages", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter send(@LoginMemberId Long memberId,
                           @Valid @RequestBody CoachChatRequest request) {
        return coachingService.chatStream(memberId, request.content());
    }

    /** 지금 건넬 칭찬 한 건 — 없으면 praise가 null이다(design D15) */
    @GetMapping("/praise")
    public PraiseResponse praise(@LoginMemberId Long memberId) {
        return praiseService.current(memberId);
    }

    /** 칭찬 읽음 처리 — 닫으면 다시 뜨지 않는다 */
    @PostMapping("/praise/{praiseId}/dismiss")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void dismissPraise(@LoginMemberId Long memberId, @PathVariable Long praiseId) {
        praiseService.dismiss(memberId, praiseId);
    }

    /** 대화 초기화 */
    @DeleteMapping("/messages")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void clear(@LoginMemberId Long memberId) {
        coachingService.clear(memberId);
    }
}
