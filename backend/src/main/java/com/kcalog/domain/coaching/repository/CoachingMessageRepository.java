package com.kcalog.domain.coaching.repository;

import com.kcalog.domain.coaching.entity.CoachingMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface CoachingMessageRepository extends JpaRepository<CoachingMessage, Long> {

    /** 그날 캐시된 브리핑 — 없으면 지연 생성 */
    Optional<CoachingMessage> findByMemberIdAndCoachDate(Long memberId, LocalDate coachDate);
}
