package com.kcalog.domain.feedback.service;

import com.kcalog.domain.feedback.dto.FeedbackResponse;
import com.kcalog.domain.feedback.dto.SendFeedbackRequest;
import com.kcalog.domain.feedback.entity.Feedback;
import com.kcalog.domain.feedback.event.FeedbackSubmittedEvent;
import com.kcalog.domain.feedback.exception.FeedbackRateLimitException;
import com.kcalog.domain.feedback.repository.FeedbackRepository;
import com.kcalog.domain.member.entity.Member;
import com.kcalog.domain.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

@Slf4j
@Service
@RequiredArgsConstructor
public class FeedbackService {

    /** 이 구간 안에 이만큼까지만 받는다 — 실수로 두 번 누르는 것은 통과하고, 도배는 막는 선 */
    static final int LIMIT = 10;
    static final Duration WINDOW = Duration.ofHours(24);

    /** 기기에 따라 아주 긴 값이 오기도 한다 — 컬럼 길이에서 잘리며 저장이 실패하지 않게 여기서 자른다 */
    private static final int USER_AGENT_MAX = 500;

    private final FeedbackRepository feedbackRepository;
    private final MemberRepository memberRepository;
    private final ApplicationEventPublisher eventPublisher;
    private final Clock clock;

    @Transactional
    public FeedbackResponse send(Long memberId, SendFeedbackRequest request, String userAgent) {
        /*
            달력 하루가 아니라 **최근 24시간**으로 센다. 자정을 기준으로 하면 시간대를 정해야 하고,
            경계 직전·직후에 몰아 보내면 상한이 사실상 두 배가 된다.
        */
        Instant since = clock.instant().minus(WINDOW);
        if (feedbackRepository.countByMemberIdAndCreatedAtAfter(memberId, since) >= LIMIT) {
            throw new FeedbackRateLimitException("의견을 너무 많이 보냈어요. 잠시 후 다시 시도해주세요.");
        }

        // 앞뒤 공백만 걷어낸다 — 가운데 줄바꿈은 회원이 나눠 쓴 것이라 그대로 둔다
        Feedback saved = feedbackRepository.save(
                Feedback.of(memberId, request.content().strip(), request.appVersion(), truncate(userAgent)));

        log.info("의견 도착: id={}, memberId={}, version={}", saved.getId(), memberId, request.appVersion());

        /*
            알림은 **저장이 커밋된 뒤에** 따로 나간다(FeedbackMailNotifier).

            같은 트랜잭션 안에서 보내면 두 가지가 깨진다. 메일 서버가 느리면 회원이 그동안 묶이고,
            발송이 실패하면 롤백되어 **의견 자체가 사라진다** — 부수적인 것 때문에 가장 중요한 것을 잃는다.
            여기서는 "저장됐다"는 사실만 알리고 끝낸다.
        */
        /*
            보낸 사람은 **저장하지 않고 알림에만 싣는다.** feedback 행에 이름을 복사해두면
            나중에 닉네임을 바꿨을 때 두 값이 갈리고, 회원 삭제와 함께 지워야 할 개인정보가 한 벌 늘어난다.
            지금 필요한 것은 "누가 보냈는지 메일에서 바로 아는 것"뿐이다.
        */
        Member member = memberRepository.findById(memberId).orElse(null);
        eventPublisher.publishEvent(new FeedbackSubmittedEvent(
                saved.getId(), memberId,
                member == null ? null : member.getNickname(),
                member == null ? null : member.getEmail(),
                saved.getContent(), saved.getAppVersion(),
                saved.getUserAgent(), saved.getCreatedAt()));

        return FeedbackResponse.of(saved);
    }

    private static String truncate(String userAgent) {
        if (userAgent == null) return null;
        return userAgent.length() <= USER_AGENT_MAX ? userAgent : userAgent.substring(0, USER_AGENT_MAX);
    }
}
