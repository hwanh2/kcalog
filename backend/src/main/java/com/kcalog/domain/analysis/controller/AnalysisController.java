package com.kcalog.domain.analysis.controller;

import com.kcalog.domain.analysis.dto.AnalysisResponse;
import com.kcalog.domain.analysis.service.AnalysisService;
import com.kcalog.domain.analysis.service.AnalysisWorker;
import com.kcalog.global.common.LoginMemberId;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

/**
 * 비동기 사진 분석 — 작업 생성(즉시 반환) + 상태 폴링.
 * createJob 커밋 후 워커를 트리거해야 별도 트랜잭션의 워커가 작업을 볼 수 있다.
 */
@RestController
@RequestMapping("/api/analyses")
@RequiredArgsConstructor
public class AnalysisController {

    private final AnalysisService analysisService;
    private final AnalysisWorker analysisWorker;

    @PostMapping
    @ResponseStatus(HttpStatus.ACCEPTED)
    public AnalysisResponse create(@LoginMemberId Long memberId,
                                   @RequestParam("image") MultipartFile image) throws IOException {
        if (image.isEmpty()) {
            throw new IllegalArgumentException("이미지가 비어 있습니다");
        }
        String contentType = image.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("이미지 파일만 업로드할 수 있습니다");
        }
        Long jobId = analysisService.createJob(memberId, image.getBytes(), contentType);
        analysisWorker.process(jobId); // 커밋 후 @Async 트리거
        return AnalysisResponse.from(analysisService.get(memberId, jobId));
    }

    @GetMapping("/{id}")
    public AnalysisResponse get(@LoginMemberId Long memberId, @PathVariable Long id) {
        return AnalysisResponse.from(analysisService.get(memberId, id));
    }
}
