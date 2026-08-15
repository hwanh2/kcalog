package com.kcalog.domain.food.repository;

import com.kcalog.domain.food.entity.MemberFavoriteMeal;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MemberFavoriteMealRepository extends JpaRepository<MemberFavoriteMeal, Long> {

    List<MemberFavoriteMeal> findByMemberIdOrderByUpdatedAtDesc(Long memberId);

    Optional<MemberFavoriteMeal> findByMemberIdAndNameNormalized(Long memberId, String nameNormalized);

    long countByMemberId(Long memberId);
}
