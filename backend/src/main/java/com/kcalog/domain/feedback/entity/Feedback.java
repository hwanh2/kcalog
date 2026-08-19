package com.kcalog.domain.feedback.entity;

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

/** 앱 안에서 보낸 의견 한 건. 보낸 뒤에는 바뀌지 않으므로 상태를 바꾸는 도메인 메서드가 없다 */
@Entity
@Table(name = "feedback")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Feedback extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long memberId;

    @Column(nullable = false, columnDefinition = "text")
    private String content;

    /** 보낼 당시 앱 버전 — 이미 고친 문제인지 가른다 */
    @Column(length = 20)
    private String appVersion;

    /**
     * 보낸 기기. 클라이언트가 실어 보내는 값이 아니라 **요청 헤더에서 읽는다** —
     * 본문에 맡기면 화면마다 빠뜨리고, 값도 마음대로 적을 수 있다.
     */
    @Column(length = 500)
    private String userAgent;

    public static Feedback of(Long memberId, String content, String appVersion, String userAgent) {
        Feedback feedback = new Feedback();
        feedback.memberId = memberId;
        feedback.content = content;
        feedback.appVersion = appVersion;
        feedback.userAgent = userAgent;
        return feedback;
    }
}
