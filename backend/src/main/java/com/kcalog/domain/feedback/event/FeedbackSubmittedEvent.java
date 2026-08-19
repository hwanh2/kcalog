package com.kcalog.domain.feedback.event;

import java.time.Instant;

/**
 * 의견이 저장됐다는 사실.
 *
 * 엔티티가 아니라 값을 실어 보낸다 — 알림은 **커밋 뒤 다른 스레드에서** 처리되므로, 그때는
 * 영속성 컨텍스트가 이미 닫혀 있어 엔티티를 건드리면 지연 로딩이 터진다.
 */
public record FeedbackSubmittedEvent(
        Long id,
        Long memberId,
        /** 보낸 사람 — id만으로는 누구인지 알려고 DB를 뒤져야 한다 */
        String memberNickname,
        /** 되물을 주소. 카카오가 주지 않았으면 없을 수 있다 */
        String memberEmail,
        String content,
        String appVersion,
        String userAgent,
        Instant createdAt
) {
}
