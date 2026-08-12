package com.kcalog.domain.analysis.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** 재분석 요청 — 설명은 필수다(덧붙일 정보가 없으면 다시 부를 이유가 없다) */
public record ReanalyzeRequest(
        @NotBlank @Size(max = 500) String note
) {
}
