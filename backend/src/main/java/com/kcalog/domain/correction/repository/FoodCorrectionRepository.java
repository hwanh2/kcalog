package com.kcalog.domain.correction.repository;

import com.kcalog.domain.correction.entity.FoodCorrection;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface FoodCorrectionRepository extends JpaRepository<FoodCorrection, Long> {

    /** 조회용 — 회원의 특정 정규화명 보정치 */
    Optional<FoodCorrection> findByMemberIdAndFoodNameNormalized(Long memberId, String foodNameNormalized);

    /** 분석 시 주입·덮어쓰기용 — 최근 갱신 순 상한 개수 */
    List<FoodCorrection> findByMemberIdOrderByUpdatedAtDesc(Long memberId, Limit limit);

    /**
     * 보정치의 원자적 upsert — 같은 음식을 동시에 저장해도 UNIQUE 충돌 없이 마지막 값이 남는다.
     *
     * <p>"찾아보고 없으면 만든다"로는 두 요청이 같은 순간 둘 다 생성 경로로 가 한쪽이 500이 된다.
     * 특히 식사 저장(MealService)이 이 메서드를 자기 트랜잭션에서 부르므로 <b>재시도로는 못 고친다</b> —
     * 되돌리면 식사 기록이 중복 생성된다. 그래서 DB가 판정하게 한다(weight_log와 같은 방식).
     *
     * <p>네이티브 쓰기라 영속성 컨텍스트를 우회하므로, 직후 재조회가 stale 캐시를 보지 않도록 flush·clear 한다.
     * created_at·updated_at은 이 테이블에 기본값이 없어 직접 넣는다.
     */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = """
            INSERT INTO food_correction (member_id, food_name_normalized, food_name_display,
                                         kcal, carb_g, protein_g, fat_g, base_quantity, unit,
                                         created_at, updated_at)
            VALUES (:memberId, :normalized, :display, :kcal, :carbG, :proteinG, :fatG,
                    :baseQuantity, :unit, clock_timestamp(), clock_timestamp())
            ON CONFLICT (member_id, food_name_normalized)
            DO UPDATE SET food_name_display = EXCLUDED.food_name_display,
                          kcal              = EXCLUDED.kcal,
                          carb_g            = EXCLUDED.carb_g,
                          protein_g         = EXCLUDED.protein_g,
                          fat_g             = EXCLUDED.fat_g,
                          base_quantity     = EXCLUDED.base_quantity,
                          unit              = EXCLUDED.unit,
                          updated_at        = clock_timestamp()
            """, nativeQuery = true)
    void upsert(@Param("memberId") Long memberId,
                @Param("normalized") String normalized,
                @Param("display") String display,
                @Param("kcal") int kcal,
                @Param("carbG") BigDecimal carbG,
                @Param("proteinG") BigDecimal proteinG,
                @Param("fatG") BigDecimal fatG,
                @Param("baseQuantity") BigDecimal baseQuantity,
                @Param("unit") String unit);
}
