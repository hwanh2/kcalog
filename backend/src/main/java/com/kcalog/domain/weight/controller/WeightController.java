package com.kcalog.domain.weight.controller;

import com.kcalog.domain.weight.dto.RecordWeightRequest;
import com.kcalog.domain.weight.dto.WeightResponse;
import com.kcalog.domain.weight.service.WeightService;
import com.kcalog.global.common.LoginMemberId;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/weights")
@RequiredArgsConstructor
public class WeightController {

    private final WeightService weightService;

    @PostMapping
    public WeightResponse record(@LoginMemberId Long memberId,
                                 @Valid @RequestBody RecordWeightRequest request) {
        return weightService.record(memberId, request);
    }

    @GetMapping
    public List<WeightResponse> history(@LoginMemberId Long memberId,
                                        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return weightService.history(memberId, from, to);
    }
}
