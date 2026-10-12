package com.kcalog.domain.auth;

import com.kcalog.IntegrationTest;
import com.kcalog.domain.auth.exception.AppsInTossUnavailableException;
import com.kcalog.domain.auth.exception.InvalidTossAuthCodeException;
import com.kcalog.domain.auth.repository.RefreshTokenRepository;
import com.kcalog.domain.auth.service.AppsInTossClient;
import com.kcalog.domain.member.entity.Member;
import com.kcalog.domain.member.entity.Provider;
import com.kcalog.domain.member.repository.MemberRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** 서비스가 트랜잭션 없이 저장하므로 @Transactional 롤백 대신 직접 지운다 */
@IntegrationTest
class TossAuthIntegrationTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    MemberRepository memberRepository;

    @Autowired
    RefreshTokenRepository refreshTokenRepository;

    @MockitoBean
    AppsInTossClient appsInTossClient;

    @AfterEach
    void tearDown() {
        memberRepository.findByProviderAndProviderId(Provider.TOSS, "anon-new").ifPresent(memberRepository::delete);
        memberRepository.findByProviderAndProviderId(Provider.TOSS, "anon-old").ifPresent(memberRepository::delete);
        memberRepository.findByProviderAndProviderId(Provider.TOSS, "shared-id").ifPresent(memberRepository::delete);
        memberRepository.findByProviderAndProviderId(Provider.KAKAO, "shared-id").ifPresent(memberRepository::delete);
    }

    private ResultActions login(String body) throws Exception {
        return mockMvc.perform(post("/api/auth/toss").contentType(MediaType.APPLICATION_JSON).content(body));
    }

    @Test
    @DisplayName("처음 보는 익명 키 → TOSS 회원 생성, 본문에 access 토큰, 쿠키 없음")
    void signUp() throws Exception {
        given(appsInTossClient.exchangeAnonKey("code-1")).willReturn("anon-new");

        String token = login("{\"code\":\"code-1\"}")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(header().doesNotExist("Set-Cookie"))
                .andReturn().getResponse().getContentAsString()
                .replaceAll(".*\"accessToken\":\"([^\"]+)\".*", "$1");

        Member member = memberRepository.findByProviderAndProviderId(Provider.TOSS, "anon-new").orElseThrow();
        assertThat(refreshTokenRepository.countByMemberId(member.getId())).isZero();
        mockMvc.perform(get("/api/members/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("이미 가입한 익명 키 → 새 회원을 만들지 않는다")
    void existingMember() throws Exception {
        memberRepository.save(Member.signUp(Provider.TOSS, "anon-old", null, null));
        long before = memberRepository.count();
        given(appsInTossClient.exchangeAnonKey("code-2")).willReturn("anon-old");

        login("{\"code\":\"code-2\"}").andExpect(status().isOk());

        assertThat(memberRepository.count()).isEqualTo(before);
    }

    @Test
    @DisplayName("카카오 회원과 provider_id가 같아도 별개 회원이다")
    void notMergedWithKakao() throws Exception {
        Member kakao = memberRepository.save(Member.signUp(Provider.KAKAO, "shared-id", null, "카카오"));
        given(appsInTossClient.exchangeAnonKey("code-3")).willReturn("shared-id");

        login("{\"code\":\"code-3\"}").andExpect(status().isOk());

        Member toss = memberRepository.findByProviderAndProviderId(Provider.TOSS, "shared-id").orElseThrow();
        assertThat(toss.getId()).isNotEqualTo(kakao.getId());
    }

    @Test
    @DisplayName("무효한 인가 코드 → 401, 회원을 만들지 않는다")
    void invalidCode() throws Exception {
        long before = memberRepository.count();
        given(appsInTossClient.exchangeAnonKey("expired")).willThrow(new InvalidTossAuthCodeException());

        login("{\"code\":\"expired\"}").andExpect(status().isUnauthorized());

        assertThat(memberRepository.count()).isEqualTo(before);
    }

    @Test
    @DisplayName("앱인토스 API 장애 → 503, 회원을 만들지 않는다")
    void unavailable() throws Exception {
        long before = memberRepository.count();
        given(appsInTossClient.exchangeAnonKey("code-4"))
                .willThrow(new AppsInTossUnavailableException("down", null));

        login("{\"code\":\"code-4\"}").andExpect(status().isServiceUnavailable());

        assertThat(memberRepository.count()).isEqualTo(before);
    }

    @Test
    @DisplayName("인가 코드 누락 → 400")
    void missingCode() throws Exception {
        login("{}").andExpect(status().isBadRequest());
    }
}
