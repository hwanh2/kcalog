package com.kcalog.domain.member.controller;

import com.kcalog.domain.member.dto.KcalSuggestionRequest;
import com.kcalog.domain.member.dto.KcalSuggestionResponse;
import com.kcalog.domain.member.dto.MemberResponse;
import com.kcalog.domain.member.dto.OnboardingRequest;
import com.kcalog.domain.member.dto.UpdateMemberRequest;
import com.kcalog.domain.member.service.MemberService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
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
    public MemberResponse me(@AuthenticationPrincipal Jwt jwt) {
        return memberService.getMe(memberId(jwt));
    }

    @PostMapping("/me/onboarding")
    public MemberResponse onboarding(@AuthenticationPrincipal Jwt jwt,
                                     @Valid @RequestBody OnboardingRequest request) {
        return memberService.completeOnboarding(memberId(jwt), request);
    }

    @GetMapping("/me/kcal-suggestion")
    public KcalSuggestionResponse kcalSuggestion(@Valid KcalSuggestionRequest request) {
        return new KcalSuggestionResponse(memberService.suggestKcal(request));
    }

    @PatchMapping("/me")
    public MemberResponse update(@AuthenticationPrincipal Jwt jwt,
                                 @Valid @RequestBody UpdateMemberRequest request) {
        return memberService.updateProfile(memberId(jwt), request);
    }

    private Long memberId(Jwt jwt) {
        return Long.valueOf(jwt.getSubject());
    }
}
