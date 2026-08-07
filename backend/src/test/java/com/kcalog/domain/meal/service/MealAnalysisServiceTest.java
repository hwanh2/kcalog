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
            new AppProperties.Openai("key", "http://x", "gpt-5.4-mini", Duration.ofSeconds(20), 20));

    MealAnalysisService service;

    @BeforeEach
    void setUp() {
        service = new MealAnalysisService(openAiClient, analysisUsageRepository, props, FIXED);
    }

    @Test
    @DisplayName("정상 분석 — 구조화 JSON을 파싱해 반환하고 호출을 카운트한다")
    void analyzeSuccess() {
        when(analysisUsageRepository.currentCount(1L, TODAY)).thenReturn(3);
        when(openAiClient.complete(any())).thenReturn("""
                {"foodFound":true,"totalKcal":650,"carbG":75.0,"proteinG":30.0,"fatG":22.0,"confidence":0.8,"notes":""}
                """);

        MealAnalysisResponse result = service.analyze(1L, IMAGE, "image/jpeg");

        assertThat(result.foodFound()).isTrue();
        assertThat(result.totalKcal()).isEqualTo(650);
        assertThat(result.carbG()).isEqualByComparingTo("75.0");
        verify(analysisUsageRepository).increment(1L, TODAY);
    }

    @Test
    @DisplayName("음식 미검출 — foodFound=false면 안내 문구와 함께 notFound로 반환")
    void foodNotFound() {
        when(analysisUsageRepository.currentCount(anyLong(), any())).thenReturn(0);
        when(openAiClient.complete(any())).thenReturn("""
                {"foodFound":false,"totalKcal":0,"carbG":0,"proteinG":0,"fatG":0,"confidence":0,"notes":"음식을 찾지 못했어요"}
                """);

        MealAnalysisResponse result = service.analyze(1L, IMAGE, "image/jpeg");

        assertThat(result.foodFound()).isFalse();
        assertThat(result.notes()).contains("음식을 찾지 못했");
    }

    @Test
    @DisplayName("상한 초과 — 카운트가 상한 이상이면 OpenAI 호출 없이 429 예외")
    void limitExceeded() {
        when(analysisUsageRepository.currentCount(1L, TODAY)).thenReturn(20);

        assertThatThrownBy(() -> service.analyze(1L, IMAGE, "image/jpeg"))
                .isInstanceOf(DailyAnalysisLimitException.class);

        verify(openAiClient, never()).complete(any());
        verify(analysisUsageRepository, never()).increment(anyLong(), any());
    }

    @Test
    @DisplayName("1차 호출 실패 — 재시도 후 성공하면 결과 반환")
    void retryThenSucceed() {
        when(analysisUsageRepository.currentCount(anyLong(), any())).thenReturn(0);
        when(openAiClient.complete(any()))
                .thenThrow(new RuntimeException("timeout"))
                .thenReturn("""
                        {"foodFound":true,"totalKcal":500,"carbG":60,"proteinG":20,"fatG":15,"confidence":0.7,"notes":""}
                        """);

        MealAnalysisResponse result = service.analyze(1L, IMAGE, "image/jpeg");

        assertThat(result.totalKcal()).isEqualTo(500);
        verify(openAiClient, times(2)).complete(any());
    }

    @Test
    @DisplayName("재시도도 실패 — MealAnalysisException으로 폴백")
    void retryThenFail() {
        when(analysisUsageRepository.currentCount(anyLong(), any())).thenReturn(0);
        when(openAiClient.complete(any())).thenThrow(new RuntimeException("down"));

        assertThatThrownBy(() -> service.analyze(1L, IMAGE, "image/jpeg"))
                .isInstanceOf(MealAnalysisException.class);
        verify(openAiClient, times(2)).complete(any());
    }

    @Test
    @DisplayName("파싱 불가 응답 — MealAnalysisException으로 폴백")
    void parseFailure() {
        when(analysisUsageRepository.currentCount(anyLong(), any())).thenReturn(0);
        when(openAiClient.complete(any())).thenReturn("not json at all");

        assertThatThrownBy(() -> service.analyze(1L, IMAGE, "image/jpeg"))
                .isInstanceOf(MealAnalysisException.class);
    }

    @Test
    @DisplayName("데이터 URL — content-type이 이미지가 아니면 image/jpeg로 대체")
    void dataUrlFallback() {
        when(analysisUsageRepository.currentCount(anyLong(), any())).thenReturn(0);
        when(openAiClient.complete(any())).thenReturn("""
                {"foodFound":true,"totalKcal":100,"carbG":1,"proteinG":1,"fatG":1,"confidence":0.5,"notes":""}
                """);

        service.analyze(1L, IMAGE, null);

        // 호출 자체가 성공하면 충분 (data URL 구성 중 NPE 없음)
        verify(openAiClient).complete(any(Map.class));
    }
}
