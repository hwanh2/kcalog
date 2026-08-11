package com.kcalog.domain.coaching.entity;

import com.kcalog.global.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

/**
 * 오늘의 브리핑 코칭 (차별점 #3). 회원당 하루 1개(coach_date 유니크)를 캐시한다.
 * 숫자는 규칙이 계산해 signalsJson 스냅샷으로 남기고, headline·message·recommendations는 LLM 서술이다.
 * source=LLM(생성) / FALLBACK(규칙 폴백은 영속하지 않으므로 실제 저장은 LLM만).
 */
@Entity
@Table(name = "coaching_message")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CoachingMessage extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long memberId;

    @Column(name = "coach_date", nullable = false)
    private LocalDate coachDate;

    @Column(nullable = false, length = 200)
    private String headline;

    @Column(nullable = false, columnDefinition = "text")
    private String message;

    @Column(name = "recommendations_json", nullable = false, columnDefinition = "text")
    private String recommendationsJson;

    @Column(name = "signals_json", nullable = false, columnDefinition = "text")
    private String signalsJson;

    @Column(nullable = false, length = 20)
    private String source;

    private CoachingMessage(Long memberId, LocalDate coachDate, String headline,
                            String message, String recommendationsJson, String signalsJson, String source) {
        this.memberId = memberId;
        this.coachDate = coachDate;
        this.headline = headline;
        this.message = message;
        this.recommendationsJson = recommendationsJson;
        this.signalsJson = signalsJson;
        this.source = source;
    }

    /** 생성된 브리핑을 저장용으로 만든다 */
    public static CoachingMessage of(Long memberId, LocalDate coachDate, String headline,
                                     String message, String recommendationsJson, String signalsJson, String source) {
        return new CoachingMessage(memberId, coachDate, headline, message, recommendationsJson, signalsJson, source);
    }
}
