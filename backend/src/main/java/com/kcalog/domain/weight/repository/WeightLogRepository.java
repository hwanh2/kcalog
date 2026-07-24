package com.kcalog.domain.weight.repository;

import com.kcalog.domain.weight.entity.WeightLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface WeightLogRepository extends JpaRepository<WeightLog, Long> {

    Optional<WeightLog> findByMemberIdAndLogDate(Long memberId, LocalDate logDate);

    Optional<WeightLog> findTopByMemberIdOrderByLogDateDesc(Long memberId);
}
