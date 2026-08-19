package com.kcalog.domain.coaching.dto;

import com.kcalog.domain.coaching.entity.Praise;

/**
 * 지금 건넬 칭찬. 없으면 {@code praise}가 null이다.
 * <p>
 * 204가 아니라 200으로 답하는 이유 — 칭찬이 없는 것은 오류도 예외도 아니라서,
 * 클라이언트가 상태 코드로 분기하지 않아도 되게 한다(design D15).
 */
public record PraiseResponse(Item praise) {

    public record Item(Long id, String kind, String message) {
    }

    public static PraiseResponse none() {
        return new PraiseResponse(null);
    }

    public static PraiseResponse of(Praise praise) {
        return new PraiseResponse(new Item(praise.getId(), praise.getKind().name(), praise.getMessage()));
    }
}
