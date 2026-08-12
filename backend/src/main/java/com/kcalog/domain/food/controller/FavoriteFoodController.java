package com.kcalog.domain.food.controller;

import com.kcalog.domain.food.dto.FoodResponse;
import com.kcalog.domain.food.dto.SaveFavoriteRequest;
import com.kcalog.domain.food.service.FoodService;
import com.kcalog.global.common.LoginMemberId;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** 즐겨찾기(나만의 음식 라이브러리) — 저장·조회·삭제 */
@RestController
@RequestMapping("/api/favorites")
@RequiredArgsConstructor
public class FavoriteFoodController {

    private final FoodService foodService;

    @GetMapping
    public List<FoodResponse> findAll(@LoginMemberId Long memberId) {
        return foodService.findFavorites(memberId);
    }

    @PostMapping
    public FoodResponse save(@LoginMemberId Long memberId, @Valid @RequestBody SaveFavoriteRequest request) {
        return foodService.saveFavorite(memberId, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@LoginMemberId Long memberId, @PathVariable Long id) {
        foodService.deleteFavorite(memberId, id);
    }
}
