package com.kcalog.domain.feedback.service;

import com.kcalog.domain.feedback.event.FeedbackSubmittedEvent;
import com.kcalog.global.common.AppProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

import java.time.Instant;

/**
 * 의견이 도착하면 메일로 알린다.
 *
 * <p><b>커밋 뒤에, 다른 스레드에서</b> 보낸다({@code AFTER_COMMIT} + {@code @Async}).
 * 저장 트랜잭션 안에서 보내면 SMTP가 느릴 때 회원이 그동안 묶이고, 발송이 실패하면 롤백되어
 * 의견 자체가 사라진다.
 *
 * <p>설정이 없으면 **아무 일도 하지 않는다.** 로컬·테스트에서 SMTP를 갖추지 않아도 의견 보내기는
 * 그대로 동작해야 한다 — 알림은 있으면 좋은 것이지, 저장의 조건이 아니다.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class FeedbackMailNotifier {

    /** 본문에 실을 의견 길이 상한 — 메일이 길어지면 훑기 어렵다. 전체는 DB에 있다 */
    private static final int PREVIEW_MAX = 1000;

    /*
        ObjectProvider인 이유: 메일 스타터를 빼거나 spring.mail 설정이 없으면 JavaMailSender 빈이
        없을 수 있다. 생성자로 직접 받으면 그 환경에서 **기동이 실패한다.**

        ⚠️ 빈이 있다고 보낼 수 있는 것은 아니다 — `${MAIL_HOST:}`처럼 값이 비어 있어도 속성 자체는
        존재해 빈이 만들어진다. 그래서 실제 판단은 **받는 주소가 있는가**로 하고, 그래도 실패하는
        경우(자격증명 오류 등)는 아래에서 삼킨다.
    */
    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final AppProperties properties;

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onFeedbackSubmitted(FeedbackSubmittedEvent event) {
        String to = recipient();
        JavaMailSender sender = mailSenderProvider.getIfAvailable();
        if (to == null || sender == null) {
            log.debug("의견 알림 건너뜀 — 받는 주소 또는 SMTP 설정 없음 (id={})", event.id());
            return;
        }

        try {
            sender.send(compose(event, to));
            log.info("의견 알림 발송: id={}", event.id());
        } catch (Exception e) {
            /*
                실패해도 삼킨다. 의견은 이미 저장됐고, 여기서 예외를 올려봐야 받을 곳이 없다
                (요청은 이미 응답을 돌려줬다). 대신 원인을 남겨 나중에 찾을 수 있게 한다.
            */
            log.error("의견 알림 발송 실패 — 의견은 저장돼 있다 (id={})", event.id(), e);
        }
    }

    private SimpleMailMessage compose(FeedbackSubmittedEvent event, String to) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(to);
        // Gmail은 계정과 다른 주소로 보낼 수 없다 — 비워두면 SMTP 계정이 그대로 발신자가 된다
        String from = properties.feedback() == null ? null : properties.feedback().mailFrom();
        if (from != null && !from.isBlank()) message.setFrom(from);

        // 제목에 보낸 사람을 넣는다 — 받은편지함에서 열어보기 전에 누구인지 읽힌다
        message.setSubject("[kcalog] %s님의 의견 #%d".formatted(blankToDash(event.memberNickname()), event.id()));

        /*
            되물을 주소가 있으면 회신 대상으로 세운다. 메일에서 그대로 "답장"을 누르면 그 사람에게 간다 —
            주소를 본문에서 찾아 복사할 필요가 없다. 카카오가 이메일을 주지 않았으면 없을 수 있다.
        */
        if (event.memberEmail() != null && !event.memberEmail().isBlank()) {
            message.setReplyTo(event.memberEmail());
        }

        message.setText("""
                %s

                ---
                보낸 사람 %s (회원 %d)
                이메일 %s
                앱 %s
                기기 %s
                받은 시각 %s
                """.formatted(
                preview(event.content()),
                blankToDash(event.memberNickname()),
                event.memberId(),
                blankToDash(event.memberEmail()),
                blankToDash(event.appVersion()),
                blankToDash(event.userAgent()),
                event.createdAt() == null ? Instant.now() : event.createdAt()));
        return message;
    }

    private String recipient() {
        if (properties.feedback() == null) return null;
        String to = properties.feedback().mailTo();
        return to == null || to.isBlank() ? null : to;
    }

    private static String preview(String content) {
        if (content == null) return "";
        return content.length() <= PREVIEW_MAX
                ? content
                : content.substring(0, PREVIEW_MAX) + "…(생략, 전체는 feedback 테이블)";
    }

    private static String blankToDash(String value) {
        return value == null || value.isBlank() ? "-" : value;
    }
}
