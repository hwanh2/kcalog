package com.kcalog.domain.coaching.repository;

import com.kcalog.domain.coaching.entity.CoachingChatMessage;
import org.springframework.data.domain.Limit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface CoachingChatMessageRepository extends JpaRepository<CoachingChatMessage, Long> {

    /** 히스토리 조회 — 시간순(오래된 것 먼저) */
    List<CoachingChatMessage> findByMemberIdOrderByCreatedAtAsc(Long memberId);

    /** 프롬프트 주입용 최근 N턴 — 최신 먼저, 서비스에서 뒤집어 사용 */
    List<CoachingChatMessage> findByMemberIdOrderByCreatedAtDesc(Long memberId, Limit limit);

    /** 초기화 — 회원 대화 전체 삭제 */
    @Transactional
    void deleteByMemberId(Long memberId);
}
