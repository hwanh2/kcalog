package com.kcalog.domain.meal.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kcalog.domain.correction.dto.PersonalCorrection;
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
import java.util.List;
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

    /** 동기 분석(레거시 엔드포인트) — 일일 제한 판정 후 이미지 분석. 개인 보정 주입 없음(빈 이력) */
    public MealAnalysisResponse analyze(Long memberId, byte[] image, String contentType) {
        enforceDailyLimit(memberId);
        return analyzeImage(image, contentType, List.of(), List.of(), null);
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

    /**
     * 사진 분석(제한 판정 없음) — 비동기 워커가 호출. 재시도·NO_FOOD·파싱 실패 처리 포함.
     * notes는 사진에 보이지 않는 정보를 담은 사용자 설명 전부이고, previousResultJson은 재분석일 때의 직전 추정이다.
     * corrections가 있으면 개인 보정 이력을 프롬프트에 주입(B) — 이력이 비면 프롬프트는 기존과 동일(eval 유효).
     */
    public MealAnalysisResponse analyzeImage(byte[] image, String contentType, List<String> notes,
                                             List<PersonalCorrection> corrections, String previousResultJson) {
        AppProperties.Openai openai = props.openai();
        String dataUrl = toDataUrl(image, contentType);
        Map<String, Object> body = MealAnalysisPrompt.requestBody(
                openai.model(), dataUrl, notes, corrections, previousItems(previousResultJson));
        return parse(callWithRetry(body));
    }

    /** 설명만 분석(제한 판정 없음) — 사진이 없으므로 위치 박스 없이 항목만 낸다 */
    public MealAnalysisResponse analyzeText(List<String> notes, List<PersonalCorrection> corrections,
                                            String previousResultJson) {
        AppProperties.Openai openai = props.openai();
        Map<String, Object> body = MealAnalysisPrompt.textRequestBody(
                openai.model(), notes, corrections, previousItems(previousResultJson));
        return parse(callWithRetry(body));
    }

    /**
     * 직전 결과 JSON을 프롬프트에 넣을 항목 목록으로 푼다.
     * <p>
     * 읽지 못해도 맥락만 빠질 뿐 재분석은 진행한다. 직전 결과 때문에 이번 요청이 막히면,
     * 사용자는 일일 횟수만 쓰고 아무것도 못 얻는다.
     */
    private List<MealAnalysisPrompt.PreviousItem> previousItems(String previousResultJson) {
        if (previousResultJson == null || previousResultJson.isBlank()) {
            return List.of();
        }
        try {
            MealAnalysisResponse previous = objectMapper.readValue(previousResultJson, MealAnalysisResponse.class);
            return previous.items().stream().map(MealAnalysisService::toPreviousItem).toList();
        } catch (Exception e) {
            log.warn("직전 추정을 읽지 못해 맥락 없이 재분석합니다: {}", e.getMessage());
            return List.of();
        }
    }

    private static MealAnalysisPrompt.PreviousItem toPreviousItem(MealAnalysisResponse.AnalyzedItem item) {
        String amount = item.amount() == null || item.unit() == null
                ? ""
                : item.amount().stripTrailingZeros().toPlainString() + item.unit();
        return new MealAnalysisPrompt.PreviousItem(item.name(), amount, item.kcal(),
                plain(item.carbG()), plain(item.proteinG()), plain(item.fatG()));
    }

    private static String plain(java.math.BigDecimal value) {
        return value == null ? "0" : value.stripTrailingZeros().toPlainString();
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
