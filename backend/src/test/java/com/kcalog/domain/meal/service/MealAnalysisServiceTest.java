package com.kcalog.domain.meal.service;

import com.kcalog.domain.meal.dto.MealAnalysisResponse;
import com.kcalog.domain.meal.exception.DailyAnalysisLimitException;
import com.kcalog.domain.meal.exception.MealAnalysisException;
import com.kcalog.domain.meal.repository.AnalysisUsageRepository;
import com.kcalog.global.common.AppProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MealAnalysisServiceTest {

    static final Clock FIXED = Clock.fixed(Instant.parse("2026-08-06T03:30:00Z"), ZoneId.of("Asia/Seoul"));
    static final LocalDate TODAY = LocalDate.of(2026, 8, 6); // KST 기준
    static final byte[] IMAGE = "fake-image".getBytes();

    @Mock
    OpenAiClient openAiClient;
    @Mock
    AnalysisUsageRepository analysisUsageRepository;

    AppProperties props = new AppProperties(null, null, null,
            new AppProperties.Openai("key", "http://x", "gpt-5.4-mini", Duration.ofSeconds(20), 20, 30), null,
            new AppProperties.Analysis(50), null);

    MealAnalysisService service;

    @BeforeEach
    void setUp() {
        service = new MealAnalysisService(openAiClient, analysisUsageRepository, props, FIXED);
    }

    @Test
    @DisplayName("정상 분석 — 다항목 구조화 JSON을 파싱해 항목·박스와 함께 반환하고 호출을 카운트한다")
    void analyzeSuccess() {
        when(analysisUsageRepository.incrementAndGet(1L, TODAY)).thenReturn(4);
        when(openAiClient.complete(any())).thenReturn("""
                {"foodFound":true,"items":[
                  {"name":"김치찌개","kcal":400,"carbG":30.0,"proteinG":20.0,"fatG":18.0,"box":{"x":0.1,"y":0.2,"w":0.3,"h":0.3}},
                  {"name":"공기밥","kcal":250,"carbG":55.0,"proteinG":5.0,"fatG":1.0,"box":{"x":0.5,"y":0.55,"w":0.25,"h":0.25}}
                ],"overallConfidence":0.8,"notes":""}
                """);

        MealAnalysisResponse result = service.analyze(1L, IMAGE, "image/jpeg");

        assertThat(result.foodFound()).isTrue();
        assertThat(result.items()).hasSize(2);
        assertThat(result.items().get(0).name()).isEqualTo("김치찌개");
        assertThat(result.items().get(0).kcal()).isEqualTo(400);
        assertThat(result.items().get(0).carbG()).isEqualByComparingTo("30.0");
        assertThat(result.items().get(0).box().x()).isEqualTo(0.1);
        assertThat(result.items().get(1).name()).isEqualTo("공기밥");
        assertThat(result.overallConfidence()).isEqualByComparingTo("0.8");
        verify(analysisUsageRepository).incrementAndGet(1L, TODAY);
    }

    @Test
    @DisplayName("음식 미검출 — foodFound=false면 빈 items와 안내 문구로 notFound 반환")
    void foodNotFound() {
        when(analysisUsageRepository.incrementAndGet(anyLong(), any())).thenReturn(1);
        when(openAiClient.complete(any())).thenReturn("""
                {"foodFound":false,"items":[],"overallConfidence":0,"notes":"음식을 찾지 못했어요"}
                """);

        MealAnalysisResponse result = service.analyze(1L, IMAGE, "image/jpeg");

        assertThat(result.foodFound()).isFalse();
        assertThat(result.items()).isEmpty();
        assertThat(result.notes()).contains("음식을 찾지 못했");
    }

    @Test
    @DisplayName("항목 없음 방어 — foodFound=true여도 items가 비면 미검출로 통일한다")
    void foodFoundButEmptyItems() {
        when(analysisUsageRepository.incrementAndGet(anyLong(), any())).thenReturn(1);
        when(openAiClient.complete(any())).thenReturn("""
                {"foodFound":true,"items":[],"overallConfidence":0.3,"notes":"불확실"}
                """);

        MealAnalysisResponse result = service.analyze(1L, IMAGE, "image/jpeg");

        assertThat(result.foodFound()).isFalse();
        assertThat(result.items()).isEmpty();
    }

    @Test
    @DisplayName("상한 초과 — 증가 결과가 상한을 넘으면 OpenAI 호출 없이 429 예외")
    void limitExceeded() {
        when(analysisUsageRepository.incrementAndGet(1L, TODAY)).thenReturn(21); // 상한 20 초과

        assertThatThrownBy(() -> service.analyze(1L, IMAGE, "image/jpeg"))
                .isInstanceOf(DailyAnalysisLimitException.class);

        verify(openAiClient, never()).complete(any());
    }

    @Test
    @DisplayName("상한 경계 — 증가 결과가 정확히 상한이면 허용된다")
    void limitBoundaryAllowed() {
        when(analysisUsageRepository.incrementAndGet(1L, TODAY)).thenReturn(20); // 상한과 동일
        when(openAiClient.complete(any())).thenReturn("""
                {"foodFound":true,"items":[
                  {"name":"샐러드","kcal":300,"carbG":30,"proteinG":10,"fatG":8,"box":{"x":0.2,"y":0.2,"w":0.5,"h":0.5}}
                ],"overallConfidence":0.6,"notes":""}
                """);

        MealAnalysisResponse result = service.analyze(1L, IMAGE, "image/jpeg");

        assertThat(result.items()).hasSize(1);
        assertThat(result.items().get(0).kcal()).isEqualTo(300);
    }

    @Test
    @DisplayName("1차 호출 실패 — 재시도 후 성공하면 결과 반환")
    void retryThenSucceed() {
        when(analysisUsageRepository.incrementAndGet(anyLong(), any())).thenReturn(1);
        when(openAiClient.complete(any()))
                .thenThrow(new RuntimeException("timeout"))
                .thenReturn("""
                        {"foodFound":true,"items":[
                          {"name":"파스타","kcal":500,"carbG":60,"proteinG":20,"fatG":15,"box":{"x":0.1,"y":0.1,"w":0.8,"h":0.8}}
                        ],"overallConfidence":0.7,"notes":""}
                        """);

        MealAnalysisResponse result = service.analyze(1L, IMAGE, "image/jpeg");

        assertThat(result.items().get(0).kcal()).isEqualTo(500);
        verify(openAiClient, times(2)).complete(any());
    }

    @Test
    @DisplayName("재시도도 실패 — MealAnalysisException으로 폴백")
    void retryThenFail() {
        when(analysisUsageRepository.incrementAndGet(anyLong(), any())).thenReturn(1);
        when(openAiClient.complete(any())).thenThrow(new RuntimeException("down"));

        assertThatThrownBy(() -> service.analyze(1L, IMAGE, "image/jpeg"))
                .isInstanceOf(MealAnalysisException.class);
        verify(openAiClient, times(2)).complete(any());
    }

    @Test
    @DisplayName("파싱 불가 응답 — MealAnalysisException으로 폴백")
    void parseFailure() {
        when(analysisUsageRepository.incrementAndGet(anyLong(), any())).thenReturn(1);
        when(openAiClient.complete(any())).thenReturn("not json at all");

        assertThatThrownBy(() -> service.analyze(1L, IMAGE, "image/jpeg"))
                .isInstanceOf(MealAnalysisException.class);
    }

    @Test
    @DisplayName("데이터 URL — content-type이 이미지가 아니면 image/jpeg로 대체")
    void dataUrlFallback() {
        when(analysisUsageRepository.incrementAndGet(anyLong(), any())).thenReturn(1);
        when(openAiClient.complete(any())).thenReturn("""
                {"foodFound":true,"items":[
                  {"name":"사과","kcal":100,"carbG":25,"proteinG":1,"fatG":1,"box":{"x":0.3,"y":0.3,"w":0.2,"h":0.2}}
                ],"overallConfidence":0.5,"notes":""}
                """);

        service.analyze(1L, IMAGE, null);

        // 호출 자체가 성공하면 충분 (data URL 구성 중 NPE 없음)
        verify(openAiClient).complete(any(Map.class));
    }
}
