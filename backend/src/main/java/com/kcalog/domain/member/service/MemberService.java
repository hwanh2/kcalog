package com.kcalog.domain.member.service;

import com.kcalog.domain.member.dto.KcalSuggestionRequest;
import com.kcalog.domain.member.dto.KcalSuggestionResponse;
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
import java.time.Clock;
import java.time.LocalDate;
import java.time.Year;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
public class MemberService {

    private final MemberRepository memberRepository;
    private final WeightLogRepository weightLogRepository;
    private final DailyKcalCalculator dailyKcalCalculator;
    /** "현재 시각"의 단일 출처 (TimeConfig의 KST Clock) — 오늘 날짜·출생연도 판정에 사용 */
    private final Clock clock;

    @Transactional(readOnly = true)
    public MemberResponse getMe(Long memberId) {
        Member member = findMember(memberId);
        return MemberResponse.of(member, latestWeight(memberId));
    }

    @Transactional
    public MemberResponse completeOnboarding(Long memberId, OnboardingRequest request) {
        validateBirthYear(request.birthYear());
        Member member = findMember(memberId);
        member.completeOnboarding(request.gender(), request.birthYear(), request.heightCm(),
                request.activityLevel(), request.goal(), request.targetWeightKg(), request.dailyKcalTarget(),
                request.muscleGoalOrDefault());

        // 현재 체중은 member가 아니라 weight_log가 소유 (design D5).
        // 동시 제출 경합에서도 안전하도록 DB의 ON CONFLICT 원자 upsert를 쓴다 (read-then-write 금지)
        weightLogRepository.upsert(memberId, LocalDate.now(clock), request.weightKg());

        return MemberResponse.of(member, request.weightKg());
    }

    @Transactional(readOnly = true)
    public KcalSuggestionResponse suggestKcal(KcalSuggestionRequest request) {
        validateBirthYear(request.birthYear());
        double maintenance = dailyKcalCalculator.maintenance(request.gender(), request.birthYear(),
                request.heightCm(), request.weightKg(), request.activityLevel());
        int target = dailyKcalCalculator.toTarget(maintenance, request.gender(), request.goal());
        return KcalSuggestionResponse.of(maintenance, target, request.weightKg(),
                request.muscleGoalOrDefault());
    }

    /** 미래 출생연도 차단 — 나이가 음수가 되면 칼로리 계산이 왜곡된다 (온보딩·제안 공용) */
    private void validateBirthYear(int birthYear) {
        if (birthYear > Year.now(clock).getValue()) {
            throw new IllegalArgumentException("출생연도는 미래일 수 없습니다");
        }
    }

    @Transactional
    public MemberResponse updateProfile(Long memberId, UpdateMemberRequest request) {
        // 수정 경로를 열면 미래 연도 구멍도 함께 열린다 — 온보딩·제안과 같은 검증을 태운다
        if (request.birthYear() != null) {
            validateBirthYear(request.birthYear());
        }
        Member member = findMember(memberId);
        member.updateProfile(request.gender(), request.birthYear(), request.heightCm(), request.activityLevel(),
                request.goal(), request.targetWeightKg(), request.dailyKcalTarget());
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
