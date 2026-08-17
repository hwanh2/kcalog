package com.kcalog.domain.feedback.repository;

import com.kcalog.domain.feedback.entity.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;

public interface FeedbackRepository extends JpaRepository<Feedback, Long> {

    /** 도배 판정용 — 최근 구간에 이 회원이 보낸 건수 */
    long countByMemberIdAndCreatedAtAfter(Long memberId, Instant since);
}
