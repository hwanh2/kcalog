package com.kcalog.domain.food.repository;

import com.kcalog.domain.food.entity.MemberFavoriteFood;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MemberFavoriteFoodRepository extends JpaRepository<MemberFavoriteFood, Long> {

    List<MemberFavoriteFood> findByMemberIdOrderByUpdatedAtDesc(Long memberId);

    Optional<MemberFavoriteFood> findByMemberIdAndNameNormalized(Long memberId, String nameNormalized);
}
