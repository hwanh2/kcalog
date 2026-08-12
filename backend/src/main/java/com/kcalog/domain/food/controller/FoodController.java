package com.kcalog.domain.food.controller;

import com.kcalog.domain.food.dto.FoodResponse;
import com.kcalog.domain.food.service.FoodService;
import com.kcalog.global.common.LoginMemberId;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/** 담을 수 있는 음식 목록 — 카탈로그 + 회원 즐겨찾기. 검색은 클라이언트가 이 목록에서 수행한다 */
@RestController
@RequestMapping("/api/foods")
@RequiredArgsConstructor
public class FoodController {

    private final FoodService foodService;

    @GetMapping
    public List<FoodResponse> findAll(@LoginMemberId Long memberId) {
        return foodService.findAll(memberId);
    }
}
