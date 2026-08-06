package com.kcalog.domain.member.controller;

import com.kcalog.domain.member.dto.KcalSuggestionRequest;
import com.kcalog.domain.member.dto.KcalSuggestionResponse;
import com.kcalog.domain.member.dto.MemberResponse;
import com.kcalog.domain.member.dto.OnboardingRequest;
import com.kcalog.domain.member.dto.UpdateMemberRequest;
import com.kcalog.domain.member.service.MemberService;
import com.kcalog.global.common.LoginMemberId;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/members")
@RequiredArgsConstructor
public class MemberController {

    private final MemberService memberService;

    @GetMapping("/me")
    public MemberResponse me(@LoginMemberId Long memberId) {
        return memberService.getMe(memberId);
    }

    @PostMapping("/me/onboarding")
    public MemberResponse onboarding(@LoginMemberId Long memberId,
                                     @Valid @RequestBody OnboardingRequest request) {
        return memberService.completeOnboarding(memberId, request);
    }

    @GetMapping("/me/kcal-suggestion")
    public KcalSuggestionResponse kcalSuggestion(@Valid KcalSuggestionRequest request) {
        return new KcalSuggestionResponse(memberService.suggestKcal(request));
    }

    @PatchMapping("/me")
    public MemberResponse update(@LoginMemberId Long memberId,
                                 @Valid @RequestBody UpdateMemberRequest request) {
        return memberService.updateProfile(memberId, request);
    }
}
