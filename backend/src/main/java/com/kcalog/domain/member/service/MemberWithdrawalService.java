package com.kcalog.domain.member.service;

import com.kcalog.domain.analysis.repository.AnalysisJobRepository;
import com.kcalog.domain.meal.repository.MealRepository;
import com.kcalog.domain.member.entity.Member;
import com.kcalog.domain.member.repository.MemberRepository;
import com.kcalog.global.storage.StorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.LinkedHashSet;
import java.util.NoSuchElementException;
import java.util.Set;

/**
 * 회원 탈퇴 (add-apps-in-toss D12). 회원 행을 지우면 DB의 기록은 외래 키 CASCADE로 함께 지워진다.
 * 스토리지의 사진은 DB 밖이라 따로 지운다.
 *
 * <p>트랜잭션을 메서드 전체에 걸지 않는다. 사진 삭제는 DB 삭제가 확정된 뒤에 해야 한다. 거꾸로 하면
 * DB 삭제가 실패했을 때 기록은 남고 사진만 사라진다. 사진 삭제가 실패하면 로그만 남긴다. 회원과 기록은 이미 지워져
 * 다시 시도할 방법이 없고, 탈퇴 자체를 실패로 돌릴 이유는 없다.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MemberWithdrawalService {

    private final MemberRepository memberRepository;
    private final MealRepository mealRepository;
    private final AnalysisJobRepository analysisJobRepository;
    private final StorageService storageService;

    public void withdraw(Long memberId) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new NoSuchElementException("회원을 찾을 수 없습니다"));

        // 식사 사진은 분석 작업의 사진을 복사해 만들기도 해서 같은 key가 두 곳에 있을 수 있다
        Set<String> imageKeys = new LinkedHashSet<>(mealRepository.findImageKeysByMemberId(memberId));
        imageKeys.addAll(analysisJobRepository.findImageKeysByMemberId(memberId));

        memberRepository.delete(member);
        log.info("회원 탈퇴: memberId={}, provider={}, photos={}", memberId, member.getProvider(), imageKeys.size());

        for (String key : imageKeys) {
            try {
                storageService.delete(key);
            } catch (RuntimeException e) {
                log.warn("탈퇴 회원 사진 삭제 실패: memberId={}, key={}", memberId, key, e);
            }
        }
    }
}
