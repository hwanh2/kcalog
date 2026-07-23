package com.kcalog.domain.member.repository;

import com.kcalog.domain.member.entity.Member;
import com.kcalog.domain.member.entity.Provider;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface MemberRepository extends JpaRepository<Member, Long> {

    Optional<Member> findByProviderAndProviderId(Provider provider, String providerId);
}
