package com.kcalog.domain.meal.repository;

import com.kcalog.domain.meal.entity.Meal;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface MealRepository extends JpaRepository<Meal, Long> {

    /** 반개구간 [from, to) 조회 — 상한 미포함(Between은 양끝 포함이라 자정 경계가 이중 계상됨) */
    List<Meal> findByMemberIdAndEatenAtGreaterThanEqualAndEatenAtLessThanOrderByEatenAtAsc(
            Long memberId, Instant from, Instant to);

    /** 소유권 검증용 — id + memberId 동시 일치해야 조회된다 (타인 것은 빈 Optional) */
    Optional<Meal> findByIdAndMemberId(Long id, Long memberId);

    /** 첫 기록 — TOTAL 리포트의 기간 시작 계산용(전체 로드 없이 첫 건만) */
    Optional<Meal> findFirstByMemberIdOrderByEatenAtAsc(Long memberId);
}
