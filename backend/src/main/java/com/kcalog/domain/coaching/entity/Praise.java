package com.kcalog.domain.coaching.entity;

import com.kcalog.global.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * 코치가 건네는 칭찬 한마디. 사건은 규칙이 감지하고 문구는 LLM이 쓴다.
 * <p>
 * {@code dedupeKey}가 같은 칭찬은 회원당 하나뿐이다(DB UNIQUE). 연속 기록 이정표처럼 평생 한 번인 것,
 * 하루 목표처럼 날짜가 키에 들어가는 것이 같은 방식으로 처리된다(design D4).
 */
@Entity
@Table(name = "praise")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Praise extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long memberId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PraiseKind kind;

    @Column(name = "dedupe_key", nullable = false, length = 60)
    private String dedupeKey;

    @Column(nullable = false, length = 200)
    private String message;

    @Column(nullable = false, length = 20)
    private String source;

    @Column(name = "dismissed_at")
    private Instant dismissedAt;

    private Praise(Long memberId, PraiseKind kind, String dedupeKey, String message, String source) {
        this.memberId = memberId;
        this.kind = kind;
        this.dedupeKey = dedupeKey;
        this.message = message;
        this.source = source;
    }

    public static Praise of(Long memberId, PraiseKind kind, String dedupeKey, String message, String source) {
        return new Praise(memberId, kind, dedupeKey, message, source);
    }

    /** 읽음 처리. 이미 읽은 것은 시각을 덮어쓰지 않는다(처음 읽은 때가 사실이다) */
    public void dismiss(Instant now) {
        if (dismissedAt == null) {
            dismissedAt = now;
        }
    }

    public boolean isDismissed() {
        return dismissedAt != null;
    }

    public boolean isOwnedBy(Long otherMemberId) {
        return memberId.equals(otherMemberId);
    }
}
