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

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;

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

    /** 즐겨찾기(최근 갱신 순) + 카탈로그(정렬 순) — 즐겨찾기를 앞에 둬 자주 쓰는 것이 먼저 보이게 한다 */
    @Transactional(readOnly = true)
    public List<FoodResponse> findAll(Long memberId) {
        List<FoodResponse> foods = new ArrayList<>();
        favoriteRepository.findByMemberIdOrderByUpdatedAtDesc(memberId).forEach(f -> foods.add(FoodResponse.of(f)));
        catalogRepository.findAllByOrderBySortOrderAsc().forEach(c -> foods.add(FoodResponse.of(c)));
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
     * rememberForAnalysis면 개인 보정치도 같은 트랜잭션에서 저장한다(1단위 환산 — "달걀 2개 140kcal"은 70kcal로).
     */
    @Transactional
    public FoodResponse saveFavorite(Long memberId, SaveFavoriteRequest request) {
        String normalized = FoodNames.normalize(request.name());
        MemberFavoriteFood favorite = favoriteRepository.findByMemberIdAndNameNormalized(memberId, normalized)
                .map(existing -> {
                    existing.update(request.name(), request.emoji(), request.quantity(), request.unit(),
                            request.kcal(), request.carbG(), request.proteinG(), request.fatG());
                    return existing;
                })
                .orElseGet(() -> favoriteRepository.save(MemberFavoriteFood.of(
                        memberId, request.name(), request.emoji(), request.quantity(), request.unit(),
                        request.kcal(), request.carbG(), request.proteinG(), request.fatG())));

        if (request.shouldRemember()) {
            rememberAsCorrection(memberId, request);
        }
        return FoodResponse.of(favorite);
    }

    @Transactional
    public void deleteFavorite(Long memberId, Long favoriteId) {
        MemberFavoriteFood favorite = favoriteRepository.findById(favoriteId)
                .filter(f -> f.isOwnedBy(memberId))
                .orElseThrow(() -> new NoSuchElementException("즐겨찾기를 찾을 수 없습니다"));
        favoriteRepository.delete(favorite);
    }

    /**
     * 보정치는 "그 섭취량 기준의 총량"으로 저장한다 — 나누지 않고 수량·단위를 함께 넘긴다.
     * 분석에 반영할 때 AI가 찾아낸 양에 맞춰 비례 조정된다(PersonalCorrection.scaledTo).
     */
    private void rememberAsCorrection(Long memberId, SaveFavoriteRequest request) {
        correctionService.upsert(memberId, request.name(),
                request.kcal(), request.carbG(), request.proteinG(), request.fatG(),
                request.quantity(), request.unit());
    }
}
