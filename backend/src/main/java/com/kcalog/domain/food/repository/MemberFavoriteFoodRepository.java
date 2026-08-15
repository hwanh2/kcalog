package com.kcalog.domain.food.repository;

import com.kcalog.domain.food.entity.MemberFavoriteFood;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface MemberFavoriteFoodRepository extends JpaRepository<MemberFavoriteFood, Long> {

    List<MemberFavoriteFood> findByMemberIdOrderByUpdatedAtDesc(Long memberId);

    Optional<MemberFavoriteFood> findByMemberIdAndNameNormalized(Long memberId, String nameNormalized);

    /**
     * 즐겨찾기의 원자적 upsert — 같은 음식을 동시에 저장해도 UNIQUE 충돌 없이 마지막 값이 남는다.
     *
     * <p>"찾아보고 없으면 만든다"로 두면 두 요청이 같은 순간 둘 다 생성 경로로 가 한쪽이 500이 된다.
     * 뜻은 "이 이름으로 이 값"이므로 동시에 눌렸다는 이유로 실패할 이유가 없다(weight_log와 같은 방식).
     *
     * <p>네이티브 쓰기라 영속성 컨텍스트를 우회하므로, 직후 재조회가 stale 캐시를 보지 않도록 flush·clear 한다.
     * created_at·updated_at은 이 테이블에 기본값이 없어 직접 넣는다. updated_at은 목록 정렬 기준이라
     * 갱신 때도 반드시 올려야 한다("방금 저장한 것이 위로").
     *
     * <p>⚠️ {@code now()}가 아니라 {@code clock_timestamp()}인 이유 — Postgres의 {@code now()}는
     * <b>트랜잭션 시작 시각</b>이라 한 트랜잭션 안에서 여러 번 저장하면 모두 같은 값이 되어 정렬이
     * 무의미해진다. 요청마다 트랜잭션이 갈리는 실사용에서는 차이가 없지만, 한 트랜잭션에서 여러 건을
     * 쓰는 경로(테스트 포함)에서 조용히 어긋난다.
     */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = """
            INSERT INTO member_favorite_food (member_id, name, name_normalized, emoji, quantity, unit,
                                              kcal, carb_g, protein_g, fat_g, created_at, updated_at)
            VALUES (:memberId, :name, :normalized, :emoji, :quantity, :unit,
                    :kcal, :carbG, :proteinG, :fatG, clock_timestamp(), clock_timestamp())
            ON CONFLICT (member_id, name_normalized)
            DO UPDATE SET name       = EXCLUDED.name,
                          emoji      = EXCLUDED.emoji,
                          quantity   = EXCLUDED.quantity,
                          unit       = EXCLUDED.unit,
                          kcal       = EXCLUDED.kcal,
                          carb_g     = EXCLUDED.carb_g,
                          protein_g  = EXCLUDED.protein_g,
                          fat_g      = EXCLUDED.fat_g,
                          updated_at = clock_timestamp()
            """, nativeQuery = true)
    void upsert(@Param("memberId") Long memberId,
                @Param("name") String name,
                @Param("normalized") String normalized,
                @Param("emoji") String emoji,
                @Param("quantity") BigDecimal quantity,
                @Param("unit") String unit,
                @Param("kcal") int kcal,
                @Param("carbG") BigDecimal carbG,
                @Param("proteinG") BigDecimal proteinG,
                @Param("fatG") BigDecimal fatG);
}
