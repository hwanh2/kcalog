package com.kcalog.domain.dashboard.service;

import com.kcalog.domain.dashboard.dto.DashboardResponse;
import com.kcalog.domain.dashboard.dto.DashboardResponse.TimelineEntry;
import com.kcalog.domain.meal.dto.MealResponse;
import com.kcalog.domain.meal.service.MealService;
import com.kcalog.domain.member.entity.Member;
import com.kcalog.domain.member.repository.MemberRepository;
import com.kcalog.domain.weight.entity.WeightLog;
import com.kcalog.domain.weight.repository.WeightLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.NoSuchElementException;

/** 하루 대시보드 집계 — meal(합계·타임라인)과 member(목표)를 읽어 잔여를 계산한다. 조회 전용 */
@Service
@RequiredArgsConstructor
public class DashboardService {

    private final MealService mealService;
    private final MemberRepository memberRepository;
    /** 단백질 목표를 체중으로 자르기 위해 필요하다. 체중은 member가 아니라 weight_log가 소유한다 */
    private final WeightLogRepository weightLogRepository;

    @Transactional(readOnly = true)
    public DashboardResponse get(Long memberId, LocalDate date) {
        List<MealResponse> meals = mealService.findByDate(memberId, date); // 섭취 시각 오름차순

        int totalKcal = meals.stream().mapToInt(MealResponse::totalKcal).sum();
        BigDecimal carbG = sum(meals, MealResponse::carbG);
        BigDecimal proteinG = sum(meals, MealResponse::proteinG);
        BigDecimal fatG = sum(meals, MealResponse::fatG);

        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new NoSuchElementException("회원을 찾을 수 없습니다"));
        Integer target = member.getDailyKcalTarget();
        // 목표 초과면 음수 잔여. 목표 미설정(온보딩 미완)이면 잔여도 null
        Integer remaining = target != null ? target - totalKcal : null;
        // 탄단지 목표는 칼로리 목표, 체중, 근육량 목표 여부에서 파생 (목표 없으면 세 값 모두 null).
        // 체중 기록이 없으면 단백질 범위를 적용할 수 없어 비율만 쓴다 (design D7)
        BigDecimal weightKg = weightLogRepository.findTopByMemberIdOrderByLogDateDesc(memberId)
                .map(WeightLog::getWeightKg)
                .orElse(null);
        MacroTargetG macroTarget = MacroTargetG.from(target, weightKg, member.isMuscleGoal());

        List<TimelineEntry> timeline = meals.stream()
                .map(m -> new TimelineEntry(m.id(), m.eatenAt(), m.mealType(), m.totalKcal()))
                .toList();

        return new DashboardResponse(totalKcal, carbG, proteinG, fatG, target, remaining,
                macroTarget.carbG(), macroTarget.proteinG(), macroTarget.fatG(), timeline);
    }

    private BigDecimal sum(List<MealResponse> meals, java.util.function.Function<MealResponse, BigDecimal> field) {
        return meals.stream().map(field).reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
