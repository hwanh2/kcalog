package com.kcalog.domain.feedback.service;

import com.kcalog.domain.feedback.event.FeedbackSubmittedEvent;
import com.kcalog.global.common.AppProperties;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

/**
 * 알림은 **있으면 좋은 것**이다. 설정이 없거나 발송이 실패해도 아무것도 무너지지 않아야 한다 —
 * 의견 자체는 이미 저장돼 있다.
 */
class FeedbackMailNotifierTest {

    static final FeedbackSubmittedEvent EVENT = new FeedbackSubmittedEvent(
            7L, 3L, "환희", "hwan@example.com", "사진 분석이 느려요", "1.0.0", "Mozilla/5.0 (iPhone)",
            Instant.parse("2026-08-17T01:00:00Z"));

    /** ObjectProvider는 인터페이스라 필요한 메서드만 흉내 낸다 */
    static ObjectProvider<JavaMailSender> provider(JavaMailSender sender) {
        @SuppressWarnings("unchecked")
        ObjectProvider<JavaMailSender> provider = mock(ObjectProvider.class);
        given(provider.getIfAvailable()).willReturn(sender);
        return provider;
    }

    static AppProperties props(String mailTo, String mailFrom) {
        return new AppProperties(null, null, null, null, null, null, null,
                new AppProperties.Feedback(mailTo, mailFrom));
    }

    @Test
    @DisplayName("받는 주소와 의견 내용·맥락을 담아 보낸다")
    void sends() {
        JavaMailSender sender = mock(JavaMailSender.class);
        List<SimpleMailMessage> sent = new ArrayList<>();
        willAnswerCapture(sender, sent);

        new FeedbackMailNotifier(provider(sender), props("me@example.com", null)).onFeedbackSubmitted(EVENT);

        assertThat(sent).singleElement().satisfies(message -> {
            assertThat(message.getTo()).containsExactly("me@example.com");
            assertThat(message.getSubject()).isEqualTo("[kcalog] 환희님의 의견 #7");
            // 답장을 누르면 보낸 사람에게 간다 — 본문에서 주소를 찾아 복사할 필요가 없다
            assertThat(message.getReplyTo()).isEqualTo("hwan@example.com");
            assertThat(message.getText())
                    .contains("사진 분석이 느려요")
                    .contains("환희")
                    .contains("hwan@example.com")
                    .contains("회원 3")
                    .contains("1.0.0")
                    .contains("Mozilla/5.0 (iPhone)");
            // 비워두면 SMTP 계정이 발신자가 된다 — Gmail은 다른 주소로 보낼 수 없다
            assertThat(message.getFrom()).isNull();
        });
    }

    @Test
    @DisplayName("받는 주소가 없으면 보내지 않는다 — 로컬·테스트에서도 의견 보내기는 동작해야 한다")
    void skipsWithoutRecipient() {
        JavaMailSender sender = mock(JavaMailSender.class);

        new FeedbackMailNotifier(provider(sender), props("  ", null)).onFeedbackSubmitted(EVENT);

        verify(sender, never()).send(any(SimpleMailMessage.class));
    }

    @Test
    @DisplayName("SMTP 설정이 없어 발송기 자체가 없으면 조용히 넘어간다")
    void skipsWithoutMailSender() {
        FeedbackMailNotifier notifier = new FeedbackMailNotifier(provider(null), props("me@example.com", null));

        assertThatCode(() -> notifier.onFeedbackSubmitted(EVENT)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("발송이 실패해도 예외를 올리지 않는다 — 받을 곳이 없고, 의견은 이미 저장돼 있다")
    void swallowsFailure() {
        JavaMailSender sender = mock(JavaMailSender.class);
        willThrow(new MailSendException("SMTP 연결 실패")).given(sender).send(any(SimpleMailMessage.class));

        FeedbackMailNotifier notifier = new FeedbackMailNotifier(provider(sender), props("me@example.com", null));

        assertThatCode(() -> notifier.onFeedbackSubmitted(EVENT)).doesNotThrowAnyException();
    }

    @Test
    @DisplayName("아주 긴 의견은 본문에서 줄인다 — 전체는 테이블에 있다")
    void truncatesLongContent() {
        JavaMailSender sender = mock(JavaMailSender.class);
        List<SimpleMailMessage> sent = new ArrayList<>();
        willAnswerCapture(sender, sent);
        FeedbackSubmittedEvent longOne = new FeedbackSubmittedEvent(
                8L, 3L, "환희", null, "가".repeat(1500), "1.0.0", null, Instant.parse("2026-08-17T01:00:00Z"));

        new FeedbackMailNotifier(provider(sender), props("me@example.com", null)).onFeedbackSubmitted(longOne);

        assertThat(sent).singleElement().satisfies(message ->
                assertThat(message.getText()).contains("(생략, 전체는 feedback 테이블)"));
    }

    @Test
    @DisplayName("이메일이 없으면 회신 대상을 세우지 않는다 — 카카오가 주지 않는 경우가 있다")
    void handlesMissingEmail() {
        JavaMailSender sender = mock(JavaMailSender.class);
        List<SimpleMailMessage> sent = new ArrayList<>();
        willAnswerCapture(sender, sent);
        FeedbackSubmittedEvent noEmail = new FeedbackSubmittedEvent(
                9L, 3L, "환희", null, "안녕", "1.0.0", null, Instant.parse("2026-08-17T01:00:00Z"));

        new FeedbackMailNotifier(provider(sender), props("me@example.com", null)).onFeedbackSubmitted(noEmail);

        assertThat(sent).singleElement().satisfies(message -> {
            assertThat(message.getReplyTo()).isNull();
            // 이름은 그대로 나오고, 없는 값만 자리표시로 채운다
            assertThat(message.getSubject()).isEqualTo("[kcalog] 환희님의 의견 #9");
            assertThat(message.getText()).contains("이메일 -");
        });
    }

    /**
     * 지금은 닉네임·이메일이 카카오 프로필에서 오고 앱에 고칠 경로가 없어 실제 악용 경로가 없다.
     * 출처가 바뀌었을 때 이 자리를 다시 떠올리게 하려고 못 박아 둔다.
     */
    @Test
    @DisplayName("이름에 줄바꿈이 섞여도 헤더가 갈라지지 않는다")
    void sanitizesHeaders() {
        JavaMailSender sender = mock(JavaMailSender.class);
        List<SimpleMailMessage> sent = new ArrayList<>();
        willAnswerCapture(sender, sent);
        FeedbackSubmittedEvent injected = new FeedbackSubmittedEvent(
                10L, 3L, "환희\r\nBcc: victim@example.com", "hwan@example.com", "안녕", "1.0.0", null,
                Instant.parse("2026-08-17T01:00:00Z"));

        new FeedbackMailNotifier(provider(sender), props("me@example.com", null)).onFeedbackSubmitted(injected);

        assertThat(sent).singleElement().satisfies(message ->
                assertThat(message.getSubject()).doesNotContain("\r").doesNotContain("\n"));
    }

    @Test
    @DisplayName("보내는 주소를 지정하면 그대로 쓴다")
    void usesConfiguredFrom() {
        JavaMailSender sender = mock(JavaMailSender.class);
        List<SimpleMailMessage> sent = new ArrayList<>();
        willAnswerCapture(sender, sent);

        new FeedbackMailNotifier(provider(sender), props("me@example.com", "bot@kcalog.site"))
                .onFeedbackSubmitted(EVENT);

        assertThat(sent).singleElement()
                .satisfies(message -> assertThat(message.getFrom()).isEqualTo("bot@kcalog.site"));
    }

    private static void willAnswerCapture(JavaMailSender sender, List<SimpleMailMessage> sink) {
        org.mockito.BDDMockito.willAnswer(invocation -> {
            sink.add(invocation.getArgument(0));
            return null;
        }).given(sender).send(any(SimpleMailMessage.class));
    }
}
