package com.kcalog.domain.member.controller;

import com.kcalog.domain.auth.service.RefreshCookie;
import com.kcalog.domain.member.dto.KcalSuggestionRequest;
import com.kcalog.domain.member.dto.KcalSuggestionResponse;
import com.kcalog.domain.member.dto.MemberResponse;
import com.kcalog.domain.member.dto.OnboardingRequest;
import com.kcalog.domain.member.dto.UpdateMemberRequest;
import com.kcalog.domain.member.service.MemberService;
import com.kcalog.domain.member.service.MemberWithdrawalService;
import com.kcalog.global.common.LoginMemberId;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/members")
@RequiredArgsConstructor
public class MemberController {

    private final MemberService memberService;
    private final MemberWithdrawalService memberWithdrawalService;

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
        return memberService.suggestKcal(request);
    }

    @PatchMapping("/me")
    public MemberResponse update(@LoginMemberId Long memberId,
                                 @Valid @RequestBody UpdateMemberRequest request) {
        return memberService.updateProfile(memberId, request);
    }

    /** 앱 둘러보기를 끝냈거나 건너뛰었다 */
    @PostMapping("/me/tutorial")
    public MemberResponse completeTutorial(@LoginMemberId Long memberId) {
        return memberService.completeTutorial(memberId);
    }

    /** 프로필의 다시 보기. 완료 기록을 지운다 */
    @DeleteMapping("/me/tutorial")
    public MemberResponse restartTutorial(@LoginMemberId Long memberId) {
        return memberService.restartTutorial(memberId);
    }

    /**
     * 회원 탈퇴. 모든 기록과 사진을 지운다. 웹의 refresh 쿠키도 함께 만료시킨다.
     * 지운 뒤 남은 refresh 토큰 행은 CASCADE로 이미 없지만, 브라우저에 남은 쿠키는 서버가 지워 줘야 한다.
     */
    @DeleteMapping("/me")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void withdraw(@LoginMemberId Long memberId, HttpServletResponse response) {
        memberWithdrawalService.withdraw(memberId);
        response.addHeader(HttpHeaders.SET_COOKIE, RefreshCookie.expired().toString());
    }
}
