package com.kcalog.domain.food.service;

import com.kcalog.domain.correction.entity.FoodNames;
import com.kcalog.domain.food.dto.FavoriteMealResponse;
import com.kcalog.domain.food.dto.SaveFavoriteMealRequest;
import com.kcalog.domain.food.entity.MemberFavoriteMeal;
import com.kcalog.domain.food.entity.MemberFavoriteMealItem;
import com.kcalog.domain.food.repository.MemberFavoriteMealRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
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
@Slf4j
@Service
@RequiredArgsConstructor
public class FavoriteMealService {

    /**
     * 회원당 세트 개수 상한. 목록을 회원 단위 전량으로 내려주므로 무한히 쌓이면 화면도 응답도 못 쓰게 된다.
     * (항목 개수 상한은 {@code MealValidation.MAX_ITEMS}를 DTO에서 공유한다 — design D6)
     */
    public static final int MAX_SETS_PER_MEMBER = 50;

    private final MemberFavoriteMealRepository repository;
    private final FavoriteMealWriter writer;

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
     *
     * <p>⚠️ 이 메서드에는 트랜잭션을 걸지 않는다. 같은 이름이 <b>동시에</b> 들어오면 둘 다 생성
     * 경로로 가 유니크 제약에 걸리는데, 한 트랜잭션 안이면 그 실패가 rollback-only로 번져
     * 덮어쓰기로 되돌릴 수 없다. 쓰기는 {@link FavoriteMealWriter}가 각각 독립 트랜잭션으로 맡는다.
     */
    public FavoriteMealResponse save(Long memberId, SaveFavoriteMealRequest request) {
        String normalized = FoodNames.normalize(request.name());
        List<MemberFavoriteMealItem> items = toItems(request.items());

        return writer.overwriteIfPresent(memberId, normalized, request.name(), items)
                .orElseGet(() -> createOrOverwriteOnRace(memberId, normalized, request.name(), items));
    }

    /**
     * 생성하되, 그 사이 같은 이름이 만들어졌으면 덮어쓴다.
     * 사용자의 뜻은 "이 이름으로 이 구성"이므로, 경쟁에서 졌다고 실패를 돌려줄 이유가 없다.
     */
    private FavoriteMealResponse createOrOverwriteOnRace(Long memberId, String normalized, String name,
                                                         List<MemberFavoriteMealItem> items) {
        try {
            return writer.create(memberId, name, items);
        } catch (DataIntegrityViolationException dup) {
            log.debug("세트 동시 생성 경쟁 — 덮어쓰기로 처리: memberId={}, name={}", memberId, name);
            return writer.overwriteIfPresent(memberId, normalized, name, items)
                    .orElseThrow(() -> dup); // 유니크 위반인데 그 이름이 없다면 다른 제약이 깨진 것이다
        }
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
