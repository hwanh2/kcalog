package com.kcalog.domain.meal.repository;

import com.kcalog.domain.meal.entity.Meal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    /** 회원 탈퇴 때 스토리지에서 지울 사진. DB는 CASCADE로 지워지지만 스토리지 파일은 따로 지워야 한다 */
    @Query("select m.imageKey from Meal m where m.memberId = :memberId and m.imageKey is not null")
    List<String> findImageKeysByMemberId(@Param("memberId") Long memberId);
}
