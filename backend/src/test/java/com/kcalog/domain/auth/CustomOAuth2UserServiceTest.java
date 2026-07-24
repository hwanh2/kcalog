package com.kcalog.domain.auth;

import com.kcalog.domain.auth.service.CustomOAuth2UserService;
import com.kcalog.domain.member.entity.Member;
import com.kcalog.domain.member.entity.Provider;
import com.kcalog.domain.member.repository.MemberRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.AuthorizationGrantType;
import org.springframework.security.oauth2.core.OAuth2AccessToken;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

/** 카카오 응답 파싱·회원 조회/생성 단위 테스트 — 카카오 API 호출(fetchUser)만 스텁 */
@ExtendWith(MockitoExtension.class)
class CustomOAuth2UserServiceTest {

    @Mock
    MemberRepository memberRepository;

    /** fetchUser(카카오 userinfo 호출)를 주어진 attributes로 대체한 서비스 생성 */
    private CustomOAuth2UserService serviceReturning(Map<String, Object> kakaoAttributes) {
        return new CustomOAuth2UserService(memberRepository) {
            @Override
            protected OAuth2User fetchUser(OAuth2UserRequest request) {
                return new DefaultOAuth2User(
                        List.of(new SimpleGrantedAuthority("ROLE_USER")), kakaoAttributes, "id");
            }
        };
    }

    private OAuth2UserRequest requestFor(String registrationId) {
        ClientRegistration registration = ClientRegistration.withRegistrationId(registrationId)
                .clientId("client-id")
                .authorizationGrantType(AuthorizationGrantType.AUTHORIZATION_CODE)
                .redirectUri("{baseUrl}/login/oauth2/code/" + registrationId)
                .authorizationUri("https://kauth.kakao.com/oauth/authorize")
                .tokenUri("https://kauth.kakao.com/oauth/token")
                .userInfoUri("https://kapi.kakao.com/v2/user/me")
                .userNameAttributeName("id")
                .build();
        OAuth2AccessToken accessToken = new OAuth2AccessToken(
                OAuth2AccessToken.TokenType.BEARER, "token", Instant.now(), Instant.now().plusSeconds(60));
        return new OAuth2UserRequest(registration, accessToken);
    }

    @Test
    @DisplayName("신규 회원 — 카카오 프로필(닉네임·이메일)을 파싱해 회원을 생성하고 memberId attribute를 담는다")
    void signUpNewMember() {
        Map<String, Object> attrs = Map.of(
                "id", 12345L,
                "kakao_account", Map.of(
                        "email", "user@kakao.com",
                        "profile", Map.of("nickname", "홍길동")));
        given(memberRepository.findByProviderAndProviderId(Provider.KAKAO, "12345")).willReturn(Optional.empty());
        Member saved = mock(Member.class);
        given(saved.getId()).willReturn(42L);
        given(memberRepository.save(any(Member.class))).willReturn(saved);

        OAuth2User result = serviceReturning(attrs).loadUser(requestFor("kakao"));

        ArgumentCaptor<Member> captor = ArgumentCaptor.forClass(Member.class);
        verify(memberRepository).save(captor.capture());
        assertThat(captor.getValue().getProvider()).isEqualTo(Provider.KAKAO);
        assertThat(captor.getValue().getProviderId()).isEqualTo("12345");
        assertThat(captor.getValue().getEmail()).isEqualTo("user@kakao.com");
        assertThat(captor.getValue().getNickname()).isEqualTo("홍길동");
        assertThat(result.<Long>getAttribute(CustomOAuth2UserService.MEMBER_ID_ATTRIBUTE)).isEqualTo(42L);
    }

    @Test
    @DisplayName("기존 회원 — 새로 생성하지 않고 기존 회원의 id를 attribute에 담는다")
    void existingMemberLogin() {
        Member existing = mock(Member.class);
        given(existing.getId()).willReturn(7L);
        given(memberRepository.findByProviderAndProviderId(Provider.KAKAO, "12345")).willReturn(Optional.of(existing));

        OAuth2User result = serviceReturning(Map.of("id", 12345L)).loadUser(requestFor("kakao"));

        verify(memberRepository, never()).save(any());
        assertThat(result.<Long>getAttribute(CustomOAuth2UserService.MEMBER_ID_ATTRIBUTE)).isEqualTo(7L);
    }

    @Test
    @DisplayName("이메일·닉네임 미동의 — kakao_account가 비어도 null로 가입된다 (email nullable 스펙)")
    void signUpWithoutEmailConsent() {
        given(memberRepository.findByProviderAndProviderId(Provider.KAKAO, "12345")).willReturn(Optional.empty());
        Member saved = mock(Member.class);
        given(saved.getId()).willReturn(43L);
        given(memberRepository.save(any(Member.class))).willReturn(saved);

        serviceReturning(Map.of("id", 12345L)).loadUser(requestFor("kakao"));

        ArgumentCaptor<Member> captor = ArgumentCaptor.forClass(Member.class);
        verify(memberRepository).save(captor.capture());
        assertThat(captor.getValue().getEmail()).isNull();
        assertThat(captor.getValue().getNickname()).isNull();
    }

    @Test
    @DisplayName("지원하지 않는 provider — 인증 예외를 던지고 회원을 만들지 않는다")
    void unsupportedProvider() {
        assertThatThrownBy(() -> serviceReturning(Map.of("id", 1L)).loadUser(requestFor("google")))
                .isInstanceOf(OAuth2AuthenticationException.class);
        verify(memberRepository, never()).save(any());
    }
}
