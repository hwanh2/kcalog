package com.kcalog.domain.meal.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kcalog.domain.meal.dto.MealAnalysisResponse;
import com.kcalog.domain.meal.exception.DailyAnalysisLimitException;
import com.kcalog.domain.meal.exception.MealAnalysisException;
import com.kcalog.domain.meal.repository.AnalysisUsageRepository;
import com.kcalog.global.common.AppProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.LocalDate;
import java.util.Base64;
import java.util.Map;

/** 사진 → OpenAI 영양 분석. 저장하지 않고 결과만 반환한다. 일일 호출 제한·재시도·폴백 포함 */
@Slf4j
@Service
public class MealAnalysisService {

    private final OpenAiClient openAiClient;
    private final AnalysisUsageRepository analysisUsageRepository;
    private final AppProperties props;
    private final Clock clock;
    // 구조화 출력(고정 스키마) 파서 — 프레임워크 ObjectMapper 빈에 의존하지 않는다
    private final ObjectMapper objectMapper = new ObjectMapper();

    public MealAnalysisService(OpenAiClient openAiClient, AnalysisUsageRepository analysisUsageRepository,
                               AppProperties props, Clock clock) {
        this.openAiClient = openAiClient;
        this.analysisUsageRepository = analysisUsageRepository;
        this.props = props;
        this.clock = clock;
    }

    /** 동기 분석(기존 엔드포인트) — 일일 제한 판정 후 이미지 분석. 비동기 흐름은 두 단계를 나눠 쓴다 */
    public MealAnalysisResponse analyze(Long memberId, byte[] image, String contentType) {
        enforceDailyLimit(memberId);
        return analyzeImage(image, contentType);
    }

    /**
     * 일일 분석 횟수 판정 — 증가와 판정을 단일 원자 연산(upsert RETURNING)으로. 동시 요청도 정확히 상한에서 막힌다(TOCTOU 없음).
     * 별도 @Transactional 없이 statement 자체가 원자적이라, 느린 OpenAI 호출 동안 DB 커넥션을 잡지 않는다.
     * 실패 호출도 비용이 발생하므로 증가는 유지한다(초과분은 그대로 카운트).
     */
    public void enforceDailyLimit(Long memberId) {
        int limit = props.openai().dailyAnalysisLimit();
        int used = analysisUsageRepository.incrementAndGet(memberId, LocalDate.now(clock));
        if (used > limit) {
            throw new DailyAnalysisLimitException("오늘 분석 가능 횟수(%d회)를 초과했어요".formatted(limit));
        }
    }

    /** 이미지만 분석(제한 판정 없음) — 비동기 워커가 호출. 재시도·NO_FOOD·파싱 실패 처리 포함 */
    public MealAnalysisResponse analyzeImage(byte[] image, String contentType) {
        AppProperties.Openai openai = props.openai();
        String dataUrl = toDataUrl(image, contentType);
        Map<String, Object> body = MealAnalysisPrompt.requestBody(openai.model(), dataUrl);
        return parse(callWithRetry(body));
    }

    /** OpenAI 호출 실패 시 1회 재시도, 그래도 실패하면 폴백(MealAnalysisException). 파싱 실패는 재시도하지 않는다 */
    private String callWithRetry(Map<String, Object> body) {
        try {
            return openAiClient.complete(body);
        } catch (RuntimeException first) {
            log.warn("식사 분석 1차 호출 실패, 재시도: {}", first.getMessage());
            try {
                return openAiClient.complete(body);
            } catch (RuntimeException second) {
                throw new MealAnalysisException("OpenAI 호출 실패", second);
            }
        }
    }

    private MealAnalysisResponse parse(String content) {
        try {
            MealAnalysisResponse result = objectMapper.readValue(content, MealAnalysisResponse.class);
            // foodFound=false거나 항목이 하나도 없으면 미검출로 통일 — 프론트가 수동 입력으로 유도한다
            if (!result.foodFound() || result.items() == null || result.items().isEmpty()) {
                log.info("음식 미검출: {}", result.notes());
                return MealAnalysisResponse.notFound(
                        result.notes() == null || result.notes().isBlank() ? "음식을 찾지 못했어요" : result.notes());
            }
            return result;
        } catch (Exception e) {
            log.warn("식사 분석 응답 파싱 실패. 원본: {}", content);
            throw new MealAnalysisException("분석 응답 파싱 실패", e);
        }
    }

    private String toDataUrl(byte[] image, String contentType) {
        String mime = contentType != null && contentType.startsWith("image/") ? contentType : "image/jpeg";
        return "data:" + mime + ";base64," + Base64.getEncoder().encodeToString(image);
    }
}
