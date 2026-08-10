package com.kcalog.domain.report.controller;

import com.kcalog.domain.report.dto.Period;
import com.kcalog.domain.report.dto.ReportResponse;
import com.kcalog.domain.report.service.ReportService;
import com.kcalog.global.common.LoginMemberId;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;

/** 기간 리포트 — 주간/월간/총. anchor 생략 시 오늘 기준. */
@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    @GetMapping
    public ReportResponse report(
            @LoginMemberId Long memberId,
            @RequestParam(defaultValue = "WEEK") Period period,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate anchor) {
        return reportService.get(memberId, period, anchor);
    }
}
