package com.kcalog.domain.auth.service;

import com.kcalog.domain.member.entity.Member;
import com.kcalog.domain.member.entity.Provider;
import com.kcalog.domain.member.repository.MemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

/**
 * 앱인토스 익명 키 로그인. refresh 토큰을 만들지 않는다. 토스 빌드는 access 토큰이 만료되면
 * 새 인가 코드로 다시 로그인한다 (add-apps-in-toss D4).
 *
 * <p>트랜잭션을 메서드 전체에 걸지 않는다. 외부 API 응답을 기다리는 동안 DB 커넥션을 붙잡지 않기 위해서다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TossAuthService {

    private final AppsInTossClient appsInTossClient;
    private final MemberRepository memberRepository;
    private final JwtService jwtService;

    public String login(String code) {
        String anonKey = appsInTossClient.exchangeAnonKey(code);
        Member member = memberRepository.findByProviderAndProviderId(Provider.TOSS, anonKey)
                .orElseGet(() -> signUp(anonKey));
        return jwtService.issueAccessToken(member.getId());
    }

    private Member signUp(String anonKey) {
        try {
            Member created = memberRepository.save(Member.signUp(Provider.TOSS, anonKey, null, null));
            log.info("신규 회원 가입: memberId={}, provider=TOSS", created.getId());
            return created;
        } catch (DataIntegrityViolationException e) {
            // 같은 사용자의 첫 로그인이 동시에 두 번 오면 한쪽이 유니크 제약에 걸린다. 먼저 만든 회원을 쓴다.
            return memberRepository.findByProviderAndProviderId(Provider.TOSS, anonKey).orElseThrow(() -> e);
        }
    }
}
