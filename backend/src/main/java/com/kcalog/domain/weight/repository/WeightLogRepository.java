package com.kcalog.domain.weight.repository;

import com.kcalog.domain.weight.entity.WeightLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface WeightLogRepository extends JpaRepository<WeightLog, Long> {

    List<WeightLog> findByMemberIdAndLogDateBetweenOrderByLogDateAsc(Long memberId, LocalDate from, LocalDate to);

    Optional<WeightLog> findByMemberIdAndLogDate(Long memberId, LocalDate logDate);


    /** 하루 1회 체중 기록의 원자적 upsert — 동시 제출 경합에서도 UNIQUE 충돌 없이 마지막 값이 남는다.
     *  네이티브 쓰기라 영속성 컨텍스트를 우회하므로, 직후 재조회가 stale 캐시를 보지 않도록 flush·clear 한다 */
    @Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query(value = """
            INSERT INTO weight_log (member_id, log_date, weight_kg)
            VALUES (:memberId, :logDate, :weightKg)
            ON CONFLICT (member_id, log_date)
            DO UPDATE SET weight_kg = EXCLUDED.weight_kg, updated_at = now()
            """, nativeQuery = true)
    void upsert(@Param("memberId") Long memberId,
                @Param("logDate") LocalDate logDate,
                @Param("weightKg") BigDecimal weightKg);

    Optional<WeightLog> findTopByMemberIdOrderByLogDateDesc(Long memberId);
}
