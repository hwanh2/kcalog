package com.kcalog.domain.coaching.repository;

import com.kcalog.domain.coaching.entity.Praise;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PraiseRepository extends JpaRepository<Praise, Long> {

    /**
     * 안 읽은 칭찬을 오래된 것부터. 우선순위 정렬은 {@link com.kcalog.domain.coaching.entity.PraiseKind}의
     * 값이라 SQL로 표현할 수 없어 서비스에서 고른다 — 안 읽은 칭찬은 많아야 몇 건이다.
     */
    List<Praise> findByMemberIdAndDismissedAtIsNullOrderByCreatedAtAsc(Long memberId);

    Optional<Praise> findByMemberIdAndDedupeKey(Long memberId, String dedupeKey);

    /** 이미 칭찬한 사건인지 — 감지 결과에서 걸러내는 데 쓴다 */
    List<Praise> findByMemberIdAndDedupeKeyIn(Long memberId, List<String> dedupeKeys);
}
