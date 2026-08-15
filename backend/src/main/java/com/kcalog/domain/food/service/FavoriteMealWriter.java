package com.kcalog.domain.food.service;

import com.kcalog.domain.food.dto.FavoriteMealResponse;
import com.kcalog.domain.food.entity.MemberFavoriteMeal;
import com.kcalog.domain.food.entity.MemberFavoriteMealItem;
import com.kcalog.domain.food.repository.MemberFavoriteMealRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

/**
 * 세트 쓰기 연산 — 생성과 덮어쓰기를 <b>각각 독립된 트랜잭션</b>으로 수행한다.
 *
 * <p>{@link FavoriteMealService}에서 분리한 이유는 <b>프록시 경계</b> 때문이다. 유니크 위반을
 * 잡아 덮어쓰기로 되돌리려면 실패한 삽입이 자기 트랜잭션 안에서 끝나야 하는데, 같은 빈 안에서
 * 호출하면 {@code @Transactional}이 걸리지 않아 바깥 트랜잭션이 rollback-only가 된다.
 * (같은 문제로 코칭 브리핑이 동시 생성 시 500을 내던 적이 있다)
 */
@Component
@RequiredArgsConstructor
class FavoriteMealWriter {

    private final MemberFavoriteMealRepository repository;

    /**
     * 이미 있으면 구성을 갈아끼운다. 응답은 <b>트랜잭션 안에서</b> 만든다 —
     * 밖에서 만들면 지연 로딩된 항목 목록에 손대는 순간 터진다.
     */
    @Transactional
    Optional<FavoriteMealResponse> overwriteIfPresent(Long memberId, String normalized, String name,
                                                      List<MemberFavoriteMealItem> items) {
        return repository.findByMemberIdAndNameNormalized(memberId, normalized)
                .map(existing -> {
                    existing.rename(name); // 표시 이름도 최신 표기로("회사 점심 a" → "회사 점심 A")
                    existing.replaceItems(items);
                    return FavoriteMealResponse.of(existing);
                });
    }

    /**
     * 새 세트 생성.
     *
     * @throws IllegalArgumentException 회원당 상한을 넘을 때
     * @throws org.springframework.dao.DataIntegrityViolationException 같은 이름이 동시에 만들어졌을 때
     */
    @Transactional
    FavoriteMealResponse create(Long memberId, String name, List<MemberFavoriteMealItem> items) {
        // ⚠️ 이 검사도 완전히 원자적이지는 않다 — 서로 다른 이름의 동시 생성은 각자 통과할 수 있어
        // 상한을 잠깐 넘길 수 있다. 다음 생성부터는 막히므로 스스로 수렴하고, 즐겨찾기 개수 상한에
        // 행 잠금을 거는 것은 얻는 것에 비해 비싸다고 봤다.
        if (repository.countByMemberId(memberId) >= FavoriteMealService.MAX_SETS_PER_MEMBER) {
            throw new IllegalArgumentException(
                    "세트는 최대 %d개까지 저장할 수 있어요".formatted(FavoriteMealService.MAX_SETS_PER_MEMBER));
        }
        return FavoriteMealResponse.of(repository.save(MemberFavoriteMeal.of(memberId, name, items)));
    }
}
