package com.kcalog.domain.meal.service;

import com.kcalog.domain.meal.entity.Meal;
import com.kcalog.domain.meal.repository.MealRepository;
import com.kcalog.global.common.ServiceDay;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Map;
import java.util.TreeMap;

/**
 * 일별 섭취 집계 — 하루 경계(현지 시간대)·그룹핑을 한 곳에 모아 Report/Tdee가 공유한다.
 * 경계는 {@link ServiceDay}의 05:00 — 반개구간 [from 05:00, to+1 05:00) 조회 후
 * 같은 규칙으로 날짜를 매겨 그룹핑한다(리포지토리 경계 규칙과 일치).
 */
@Service
@RequiredArgsConstructor
public class MealDailyIntake {

    private final MealRepository mealRepository;

    @Transactional(readOnly = true)
    public Map<LocalDate, DailyNutrition> byDate(Long memberId, LocalDate from, LocalDate to, ZoneId zone) {
        Instant start = ServiceDay.startOf(from, zone);
        Instant end = ServiceDay.endOf(to, zone);
        Map<LocalDate, DailyNutrition> byDate = new TreeMap<>();
        for (Meal m : mealRepository
                .findByMemberIdAndEatenAtGreaterThanEqualAndEatenAtLessThanOrderByEatenAtAsc(memberId, start, end)) {
            LocalDate d = ServiceDay.of(m.getEatenAt(), zone);
            byDate.merge(d, DailyNutrition.of(m), DailyNutrition::plus);
        }
        return byDate;
    }

    /** 첫 기록일(서비스 날짜) — 없으면 null. TOTAL 기간 시작 계산용(전체 로드 없이 첫 건만) */
    @Transactional(readOnly = true)
    public LocalDate earliestDate(Long memberId, ZoneId zone) {
        return mealRepository.findFirstByMemberIdOrderByEatenAtAsc(memberId)
                .map(m -> ServiceDay.of(m.getEatenAt(), zone))
                .orElse(null);
    }

    /** 하루 섭취 합계 */
    public record DailyNutrition(int kcal, BigDecimal carbG, BigDecimal proteinG, BigDecimal fatG) {
        static DailyNutrition of(Meal m) {
            return new DailyNutrition(m.getTotalKcal(), m.getCarbG(), m.getProteinG(), m.getFatG());
        }

        DailyNutrition plus(DailyNutrition o) {
            return new DailyNutrition(kcal + o.kcal, carbG.add(o.carbG), proteinG.add(o.proteinG), fatG.add(o.fatG));
        }
    }
}
