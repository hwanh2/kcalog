package com.kcalog.domain.correction.repository;

import com.kcalog.domain.correction.entity.FoodCorrection;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface FoodCorrectionRepository extends JpaRepository<FoodCorrection, Long> {

    /** upsert 매칭 — 회원의 특정 정규화명 보정치 */
    Optional<FoodCorrection> findByMemberIdAndFoodNameNormalized(Long memberId, String foodNameNormalized);

    /** 분석 시 주입·덮어쓰기용 — 최근 갱신 순 상한 개수 */
    List<FoodCorrection> findByMemberIdOrderByUpdatedAtDesc(Long memberId, Limit limit);
}
