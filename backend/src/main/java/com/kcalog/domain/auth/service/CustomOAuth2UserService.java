package com.kcalog.domain.auth.service;

import com.kcalog.domain.member.entity.Member;
import com.kcalog.domain.member.entity.Provider;
import com.kcalog.domain.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** OAuth 로그인 성공 시 provider 프로필로 회원을 조회/생성한다 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    /** SuccessHandler가 회원 id를 꺼낼 때 쓰는 attribute 키 */
    public static final String MEMBER_ID_ATTRIBUTE = "memberId";

    private final MemberRepository members;

    @Override
    @Transactional
    public OAuth2User loadUser(OAuth2UserRequest request) {
        OAuth2User oAuth2User = super.loadUser(request);
        String registrationId = request.getClientRegistration().getRegistrationId();
        if (!"kakao".equals(registrationId)) {
            throw new OAuth2AuthenticationException(
                    new OAuth2Error("unsupported_provider"), "unsupported provider: " + registrationId);
        }

        Map<String, Object> attributes = oAuth2User.getAttributes();
        String providerId = String.valueOf(attributes.get("id"));
        Map<String, Object> account = subMap(attributes, "kakao_account");
        Map<String, Object> profile = subMap(account, "profile");
        String email = (String) account.get("email");
        String nickname = (String) profile.get("nickname");

        Member member = members.findByProviderAndProviderId(Provider.KAKAO, providerId)
                .orElseGet(() -> {
                    Member created = members.save(Member.signUp(Provider.KAKAO, providerId, email, nickname));
                    log.info("신규 회원 가입: memberId={}, provider=KAKAO", created.getId());
                    return created;
                });

        Map<String, Object> enriched = new HashMap<>(attributes);
        enriched.put(MEMBER_ID_ATTRIBUTE, member.getId());

        String nameAttribute = request.getClientRegistration()
                .getProviderDetails().getUserInfoEndpoint().getUserNameAttributeName();
        return new DefaultOAuth2User(List.of(new SimpleGrantedAuthority("ROLE_USER")), enriched, nameAttribute);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> subMap(Map<String, Object> map, String key) {
        Object value = map.get(key);
        return value instanceof Map ? (Map<String, Object>) value : Map.of();
    }
}
