package com.kcalog.domain.tdee.controller;

import com.kcalog.domain.tdee.dto.TdeeResponse;
import com.kcalog.domain.tdee.service.TdeeService;
import com.kcalog.global.common.LoginMemberId;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 적응형 유지칼로리 — 현재 실측/공식 TDEE·추천 목표. 목표 적용은 기존 PATCH /api/members. */
@RestController
@RequestMapping("/api/tdee")
@RequiredArgsConstructor
public class TdeeController {

    private final TdeeService tdeeService;

    @GetMapping
    public TdeeResponse get(@LoginMemberId Long memberId) {
        return tdeeService.get(memberId);
    }
}
