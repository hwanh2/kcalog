package com.kcalog.domain.feedback;

import com.kcalog.IntegrationTest;
import com.kcalog.domain.auth.service.JwtService;
import com.kcalog.domain.feedback.entity.Feedback;
import com.kcalog.domain.feedback.repository.FeedbackRepository;
import com.kcalog.domain.member.entity.Member;
import com.kcalog.domain.member.entity.Provider;
import com.kcalog.domain.member.repository.MemberRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@IntegrationTest
@Transactional
class FeedbackIntegrationTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    MemberRepository memberRepository;

    @Autowired
    FeedbackRepository feedbackRepository;

    @Autowired
    JwtService jwtService;

    Member member;
    String bearer;

    @BeforeEach
    void setUp() {
        member = memberRepository.save(Member.signUp(Provider.KAKAO, "kakao-feedback", "f@kakao.com", "테스터"));
        bearer = "Bearer " + jwtService.issueAccessToken(member.getId());
    }

    @Test
    @DisplayName("의견 보내기 — 내용과 앱 버전이 저장되고, 기기 정보는 헤더에서 채워진다")
    void send() throws Exception {
        mockMvc.perform(post("/api/feedback").header("Authorization", bearer)
                        .header(HttpHeaders.USER_AGENT, "Mozilla/5.0 (iPhone)")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\": \"  사진 분석이 느려요  \", \"appVersion\": \"1.0.0\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.createdAt").exists())
                // 보낸 글을 되돌려주지 않는다 — 화면이 이미 갖고 있다
                .andExpect(jsonPath("$.content").doesNotExist());

        assertThat(feedbackRepository.findAll()).singleElement().satisfies(saved -> {
            assertThat(saved.getMemberId()).isEqualTo(member.getId());
            assertThat(saved.getContent()).isEqualTo("사진 분석이 느려요"); // 앞뒤 공백은 걷힌다
            assertThat(saved.getAppVersion()).isEqualTo("1.0.0");
            assertThat(saved.getUserAgent()).isEqualTo("Mozilla/5.0 (iPhone)");
        });
    }

    @Test
    @DisplayName("빈 내용은 400 — 아무것도 안 적고 보낸 것은 의견이 아니다")
    void rejectBlank() throws Exception {
        mockMvc.perform(post("/api/feedback").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"content\": \"   \"}"))
                .andExpect(status().isBadRequest());

        assertThat(feedbackRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("2000자를 넘으면 400 — 컬럼이 아니라 검증에서 막는다")
    void rejectTooLong() throws Exception {
        String tooLong = "가".repeat(2001);
        mockMvc.perform(post("/api/feedback").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\": \"" + tooLong + "\"}"))
                .andExpect(status().isBadRequest());

        assertThat(feedbackRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("로그인하지 않으면 401 — 누가 보냈는지 모르면 되물을 수 없다")
    void rejectAnonymous() throws Exception {
        mockMvc.perform(post("/api/feedback")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"content\": \"안녕\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("24시간 안에 10건을 넘기면 429 — 실수로 두 번 누르는 것은 통과하고 도배는 막는다")
    void rejectFlood() throws Exception {
        for (int i = 0; i < 10; i++) {
            feedbackRepository.save(Feedback.of(member.getId(), "의견 " + i, "1.0.0", null));
        }

        mockMvc.perform(post("/api/feedback").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"content\": \"열한 번째\"}"))
                .andExpect(status().isTooManyRequests());

        assertThat(feedbackRepository.findAll()).hasSize(10);
    }

    @Test
    @DisplayName("SMTP 설정이 없어도 의견은 저장된다 — 알림은 있으면 좋은 것이지 저장의 조건이 아니다")
    void savesWithoutMailConfigured() throws Exception {
        // 테스트 환경에는 spring.mail.host가 없다 — JavaMailSender 빈 자체가 만들어지지 않는다
        mockMvc.perform(post("/api/feedback").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"content\": \"알림 없이도 저장돼야 한다\"}"))
                .andExpect(status().isOk());

        assertThat(feedbackRepository.findAll()).singleElement()
                .satisfies(saved -> assertThat(saved.getContent()).isEqualTo("알림 없이도 저장돼야 한다"));
    }

    @Test
    @DisplayName("상한은 회원별로 센다 — 남이 많이 보냈다고 내가 막히지 않는다")
    void limitIsPerMember() throws Exception {
        Member other = memberRepository.save(Member.signUp(Provider.KAKAO, "kakao-other", "o@kakao.com", "다른사람"));
        for (int i = 0; i < 10; i++) {
            feedbackRepository.save(Feedback.of(other.getId(), "의견 " + i, "1.0.0", null));
        }

        mockMvc.perform(post("/api/feedback").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"content\": \"내 의견\"}"))
                .andExpect(status().isOk());
    }
}
