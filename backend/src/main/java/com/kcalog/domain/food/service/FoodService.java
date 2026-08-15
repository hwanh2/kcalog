package com.kcalog.domain.food.service;

import com.kcalog.domain.correction.entity.FoodNames;
import com.kcalog.domain.correction.service.FoodCorrectionService;
import com.kcalog.domain.food.dto.FoodResponse;
import com.kcalog.domain.food.dto.SaveFavoriteRequest;
import com.kcalog.domain.food.entity.MemberFavoriteFood;
import com.kcalog.domain.food.repository.FoodCatalogRepository;
import com.kcalog.domain.food.repository.MemberFavoriteFoodRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * 담을 수 있는 음식 — 공통 카탈로그와 회원 즐겨찾기를 한 목록으로 제공하고, 즐겨찾기를 관리한다.
 * 검색·수량 계산은 클라이언트가 수행한다(목록이 작아 왕복 없이 즉시 필터할 수 있다 — design D12).
 */
@Service
@RequiredArgsConstructor
public class FoodService {

    private final FoodCatalogRepository catalogRepository;
    private final MemberFavoriteFoodRepository favoriteRepository;
    private final FoodCorrectionService correctionService;

    /**
     * 즐겨찾기(최근 갱신 순) + 카탈로그(정렬 순) — 즐겨찾기를 앞에 둬 자주 쓰는 것이 먼저 보이게 한다.
     *
     * 카탈로그 음식을 즐겨찾기에 저장하면 같은 음식이 사본과 원본으로 두 번 들어오므로,
     * **이름이 겹치는 카탈로그 항목은 제외한다**(회원이 저장한 값이 우선). 판정은 즐겨찾기 저장·조회와
     * 같은 정규화 규칙(FoodNames.normalize)을 쓴다 — 여기서만 다르면 "저장했는데 또 뜬다"가 된다.
     */
    @Transactional(readOnly = true)
    public List<FoodResponse> findAll(Long memberId) {
        List<MemberFavoriteFood> favorites = favoriteRepository.findByMemberIdOrderByUpdatedAtDesc(memberId);
        Set<String> favoriteNames = favorites.stream()
                .map(MemberFavoriteFood::getNameNormalized)
                .collect(Collectors.toSet());

        List<FoodResponse> foods = new ArrayList<>();
        favorites.forEach(f -> foods.add(FoodResponse.of(f)));
        catalogRepository.findAllByOrderBySortOrderAsc().stream()
                .filter(c -> !favoriteNames.contains(FoodNames.normalize(c.getName())))
                .forEach(c -> foods.add(FoodResponse.of(c)));
        return foods;
    }

    @Transactional(readOnly = true)
    public List<FoodResponse> findFavorites(Long memberId) {
        return favoriteRepository.findByMemberIdOrderByUpdatedAtDesc(memberId).stream()
                .map(FoodResponse::of)
                .toList();
    }

    /**
     * 즐겨찾기 저장 — 정규화명으로 매칭해 없으면 생성, 있으면 최신값 덮어쓰기.
     * rememberForAnalysis면 개인 보정치도 같은 트랜잭션에서 저장한다.
     *
     * <p>판정은 DB에 맡긴다({@code ON CONFLICT}) — "찾아보고 없으면 만든다"로 두면 같은 이름이
     * 동시에 들어올 때 둘 다 생성 경로로 가 한쪽이 500이 된다. 뜻은 "이 이름으로 이 값"이므로
     * 동시에 눌렸다는 이유로 실패할 이유가 없다.
     */
    @Transactional
    public FoodResponse saveFavorite(Long memberId, SaveFavoriteRequest request) {
        String normalized = FoodNames.normalize(request.name());
        favoriteRepository.upsert(memberId, request.name(), normalized, request.emoji(),
                request.quantity(), request.unit(), request.kcal(),
                request.carbG(), request.proteinG(), request.fatG());

        if (request.shouldRemember()) {
            // 보정치는 "그 섭취량 기준의 총량"으로 저장한다 — 나누지 않고 수량·단위를 함께 넘긴다.
            // 분석에 반영할 때 AI가 찾아낸 양에 맞춰 비례 조정된다(PersonalCorrection.scaledTo).
            correctionService.upsert(memberId, request.name(),
                    request.kcal(), request.carbG(), request.proteinG(), request.fatG(),
                    request.quantity(), request.unit());
        }

        return favoriteRepository.findByMemberIdAndNameNormalized(memberId, normalized)
                .map(FoodResponse::of)
                .orElseThrow(() -> new IllegalStateException("방금 저장한 즐겨찾기를 찾지 못했습니다"));
    }

    @Transactional
    public void deleteFavorite(Long memberId, Long favoriteId) {
        MemberFavoriteFood favorite = favoriteRepository.findById(favoriteId)
                .filter(f -> f.isOwnedBy(memberId))
                .orElseThrow(() -> new NoSuchElementException("즐겨찾기를 찾을 수 없습니다"));
        favoriteRepository.delete(favorite);
    }

}
