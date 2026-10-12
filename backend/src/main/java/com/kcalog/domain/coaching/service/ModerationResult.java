package com.kcalog.domain.coaching.service;

import java.util.Set;

/** OpenAI Moderation 결과. categories는 걸린 항목 이름(예: "self-harm/intent")만 담는다 */
public record ModerationResult(boolean flagged, Set<String> categories) {

    public ModerationResult {
        categories = categories == null ? Set.of() : Set.copyOf(categories);
    }
}
