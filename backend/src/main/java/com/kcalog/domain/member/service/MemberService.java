package com.kcalog.domain.member.service;

import com.kcalog.domain.member.dto.KcalSuggestionRequest;
import com.kcalog.domain.member.dto.MemberResponse;
import com.kcalog.domain.member.dto.OnboardingRequest;
import com.kcalog.domain.member.dto.UpdateMemberRequest;
import com.kcalog.domain.member.entity.Member;
import com.kcalog.domain.member.repository.MemberRepository;
import com.kcalog.domain.weight.entity.WeightLog;
import com.kcalog.domain.weight.repository.WeightLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Year;
import java.time.ZoneId;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
public class MemberService {

    /** 기록의 "오늘" 판정 기준 시간대 — 한국 사용자 기준 (log_date 의미론) */
    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    private final MemberRepository memberRepository;
    private final WeightLogRepository weightLogRepository;
    private final DailyKcalCalculator dailyKcalCalculator;

    @Transactional(readOnly = true)
    public MemberResponse getMe(Long memberId) {
        Member member = findMember(memberId);
        return MemberResponse.of(member, latestWeight(memberId));
    }

    @Transactional
    public MemberResponse completeOnboarding(Long memberId, OnboardingRequest request) {
        if (request.birthYear() > Year.now(KST).getValue()) {
            throw new IllegalArgumentException("birthYear must not be in the future");
        }
        Member member = findMember(memberId);
        member.completeOnboarding(request.gender(), request.birthYear(), request.heightCm(),
                request.activityLevel(), request.targetWeightKg(), request.dailyKcalTarget());

        // 현재 체중은 member가 아니라 weight_log가 소유 (design D5) — 오늘 날짜로 upsert
        LocalDate today = LocalDate.now(KST);
        weightLogRepository.findByMemberIdAndLogDate(memberId, today)
                .ifPresentOrElse(
                        log -> log.updateWeight(request.weightKg()),
                        () -> weightLogRepository.save(WeightLog.record(memberId, today, request.weightKg())));

        return MemberResponse.of(member, request.weightKg());
    }

    @Transactional(readOnly = true)
    public int suggestKcal(KcalSuggestionRequest request) {
        return dailyKcalCalculator.suggest(request.gender(), request.birthYear(), request.heightCm(),
                request.weightKg(), request.targetWeightKg(), request.activityLevel());
    }

    @Transactional
    public MemberResponse updateProfile(Long memberId, UpdateMemberRequest request) {
        Member member = findMember(memberId);
        member.updateProfile(request.heightCm(), request.activityLevel(),
                request.targetWeightKg(), request.dailyKcalTarget());
        return MemberResponse.of(member, latestWeight(memberId));
    }

    private Member findMember(Long memberId) {
        return memberRepository.findById(memberId)
                .orElseThrow(() -> new NoSuchElementException("member not found: " + memberId));
    }

    private BigDecimal latestWeight(Long memberId) {
        return weightLogRepository.findTopByMemberIdOrderByLogDateDesc(memberId)
                .map(WeightLog::getWeightKg)
                .orElse(null);
    }
}
