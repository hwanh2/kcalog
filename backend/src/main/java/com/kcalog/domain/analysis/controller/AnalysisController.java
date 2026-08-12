package com.kcalog.domain.analysis.controller;

import com.kcalog.domain.analysis.dto.AnalysisResponse;
import com.kcalog.domain.analysis.dto.ReanalyzeRequest;
import com.kcalog.domain.analysis.service.AnalysisService;
import com.kcalog.domain.analysis.service.AnalysisWorker;
import com.kcalog.global.common.LoginMemberId;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

/**
 * 비동기 음식 분석 — 작업 생성(즉시 반환) + 상태 폴링 + 재분석.
 * 입력은 사진·설명 각각 선택이며 최소 하나는 있어야 한다(사진만/사진+설명/설명만).
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
                                   @RequestParam(value = "image", required = false) MultipartFile image,
                                   @RequestParam(value = "note", required = false) String note) throws IOException {
        byte[] bytes = null;
        String contentType = null;
        if (image != null && !image.isEmpty()) {
            contentType = image.getContentType();
            if (contentType == null || !contentType.startsWith("image/")) {
                throw new IllegalArgumentException("이미지 파일만 업로드할 수 있습니다");
            }
            bytes = image.getBytes();
        }
        String trimmedNote = note == null || note.isBlank() ? null : note.trim();
        if (bytes == null && trimmedNote == null) {
            throw new IllegalArgumentException("사진이나 설명 중 하나는 있어야 합니다");
        }

        Long jobId = analysisService.createJob(memberId, bytes, contentType, trimmedNote);
        analysisWorker.process(jobId); // 커밋 후 @Async 트리거
        return AnalysisResponse.from(analysisService.get(memberId, jobId));
    }

    @GetMapping("/{id}")
    public AnalysisResponse get(@LoginMemberId Long memberId, @PathVariable Long id) {
        return AnalysisResponse.from(analysisService.get(memberId, id));
    }

    /** 설명을 덧붙여 다시 분석 — 같은 작업을 갱신하고 사진은 재사용한다(작업당 2회) */
    @PostMapping("/{id}/reanalyze")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public AnalysisResponse reanalyze(@LoginMemberId Long memberId, @PathVariable Long id,
                                      @Valid @RequestBody ReanalyzeRequest request) {
        analysisService.reanalyze(memberId, id, request.note().trim());
        analysisWorker.process(id); // 커밋 후 @Async 트리거
        return AnalysisResponse.from(analysisService.get(memberId, id));
    }
}
