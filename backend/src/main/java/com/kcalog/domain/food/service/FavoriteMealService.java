package com.kcalog.domain.food.service;

import com.kcalog.domain.correction.entity.FoodNames;
import com.kcalog.domain.food.dto.FavoriteMealResponse;
import com.kcalog.domain.food.dto.SaveFavoriteMealRequest;
import com.kcalog.domain.food.entity.MemberFavoriteMeal;
import com.kcalog.domain.food.entity.MemberFavoriteMealItem;
import com.kcalog.domain.food.repository.MemberFavoriteMealRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.stream.IntStream;

/**
 * 끼니 세트 — 음식 조합을 이름 붙여 보관하고 다시 담을 수 있게 한다.
 *
 * <p>여기서 만드는 것은 <b>틀이지 먹은 기록이 아니다.</b> 담기는 기존 {@code POST /api/meals}가
 * 그대로 처리한다 — 세트 전용 저장 경로를 두면 기록 생성 규칙(합계·분석 연결)을 두 곳에서
 * 지켜야 한다(design D4).
 */
@Service
@RequiredArgsConstructor
public class FavoriteMealService {

    /**
     * 회원당 세트 개수 상한. 목록을 회원 단위 전량으로 내려주므로 무한히 쌓이면 화면도 응답도 못 쓰게 된다.
     * (항목 개수 상한은 {@code MealValidation.MAX_ITEMS}를 DTO에서 공유한다 — design D6)
     */
    public static final int MAX_SETS_PER_MEMBER = 50;

    private final MemberFavoriteMealRepository repository;

    @Transactional(readOnly = true)
    public List<FavoriteMealResponse> findAll(Long memberId) {
        return repository.findByMemberIdOrderByUpdatedAtDesc(memberId).stream()
                .map(FavoriteMealResponse::of)
                .toList();
    }

    /**
     * 저장 — 정규화명으로 매칭해 없으면 생성, 있으면 <b>구성을 덮어쓴다</b>.
     * 판정 규칙은 즐겨찾기 음식과 같은 {@link FoodNames#normalize}다. 여기서만 다르면
     * "저장했는데 또 생긴다"가 된다(design D3).
     */
    @Transactional
    public FavoriteMealResponse save(Long memberId, SaveFavoriteMealRequest request) {
        String normalized = FoodNames.normalize(request.name());
        List<MemberFavoriteMealItem> items = toItems(request.items());

        MemberFavoriteMeal saved = repository.findByMemberIdAndNameNormalized(memberId, normalized)
                .map(existing -> {
                    // 표시 이름도 최신 표기로 갱신한다("회사 점심 a" → "회사 점심 A")
                    existing.rename(request.name());
                    existing.replaceItems(items);
                    return existing;
                })
                .orElseGet(() -> {
                    // 상한은 **새로 만들 때만** 본다 — 덮어쓰기는 개수를 늘리지 않으므로 막을 이유가 없다
                    if (repository.countByMemberId(memberId) >= MAX_SETS_PER_MEMBER) {
                        throw new IllegalArgumentException(
                                "세트는 최대 %d개까지 저장할 수 있어요".formatted(MAX_SETS_PER_MEMBER));
                    }
                    return repository.save(MemberFavoriteMeal.of(memberId, request.name(), items));
                });
        return FavoriteMealResponse.of(saved);
    }

    @Transactional
    public void delete(Long memberId, Long favoriteMealId) {
        MemberFavoriteMeal meal = repository.findById(favoriteMealId)
                .filter(m -> m.isOwnedBy(memberId))
                .orElseThrow(() -> new NoSuchElementException("세트를 찾을 수 없습니다"));
        repository.delete(meal);
    }

    /** 요청 순서를 그대로 표시 순서로 둔다 — 사진 속 배치 순서가 곧 상 차림 순서다 */
    private List<MemberFavoriteMealItem> toItems(List<SaveFavoriteMealRequest.Item> requested) {
        return IntStream.range(0, requested.size())
                .mapToObj(i -> {
                    SaveFavoriteMealRequest.Item item = requested.get(i);
                    return MemberFavoriteMealItem.of(item.name(), item.quantity(), item.unit(), item.kcal(),
                            item.carbG(), item.proteinG(), item.fatG(), i);
                })
                .toList();
    }
}
