package com.kcalog.domain.food.controller;

import com.kcalog.domain.food.dto.FavoriteMealResponse;
import com.kcalog.domain.food.dto.SaveFavoriteMealRequest;
import com.kcalog.domain.food.service.FavoriteMealService;
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

/** 끼니 세트(음식 조합 즐겨찾기) — 저장·조회·삭제. 담기는 POST /api/meals가 맡는다 */
@RestController
@RequestMapping("/api/favorite-meals")
@RequiredArgsConstructor
public class FavoriteMealController {

    private final FavoriteMealService favoriteMealService;

    @GetMapping
    public List<FavoriteMealResponse> findAll(@LoginMemberId Long memberId) {
        return favoriteMealService.findAll(memberId);
    }

    @PostMapping
    public FavoriteMealResponse save(@LoginMemberId Long memberId,
                                     @Valid @RequestBody SaveFavoriteMealRequest request) {
        return favoriteMealService.save(memberId, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@LoginMemberId Long memberId, @PathVariable Long id) {
        favoriteMealService.delete(memberId, id);
    }
}
