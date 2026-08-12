package com.kcalog.domain.coaching.service;

import com.kcalog.domain.meal.service.MealDailyIntake;
import com.kcalog.domain.member.entity.Member;
import com.kcalog.domain.member.entity.Provider;
import com.kcalog.domain.member.repository.MemberRepository;
import com.kcalog.domain.report.dto.Period;
import com.kcalog.domain.report.dto.ReportResponse;
import com.kcalog.domain.report.service.ReportService;
import com.kcalog.domain.tdee.dto.TdeeResponse;
import com.kcalog.domain.tdee.service.TdeeService;
import com.kcalog.domain.weight.repository.WeightLogRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 섭취의 "하루"(05시 경계)와 체중의 "하루"(달력)가 다르다는 데서 오는 경계 버그를 고정한다.
 * <p>
 * 새벽 2시에는 서비스 날짜가 전날인데, 체중은 달력 날짜로 저장된다. 체중 조회에 섭취용 날짜를
 * 그대로 쓰면 방금 기록한 오늘 체중이 조회 구간 밖으로 밀려 연속일이 0으로 보인다.
 * 벽시계에 의존하지 않도록 고정 Clock으로 새벽 시각을 재현한다.
 */
class CoachingSignalsCollectorTest {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");
    private static final LocalDate CALENDAR_TODAY = LocalDate.of(2026, 8, 13);
    /** 새벽 2시 — 서비스 날짜는 8/12, 달력 날짜는 8/13으로 갈리는 시각 */
    private static final Clock AT_2AM = Clock.fixed(
            ZonedDateTime.of(2026, 8, 13, 2, 0, 0, 0, KST).toInstant(), KST);

    private final ReportService reportService = mock(ReportService.class);
    private final TdeeService tdeeService = mock(TdeeService.class);
    private final MealDailyIntake mealDailyIntake = mock(MealDailyIntake.class);
    private final WeightLogRepository weightLogRepository = mock(WeightLogRepository.class);
    private final MemberRepository memberRepository = mock(MemberRepository.class);

    private final CoachingSignalsCollector collector = new CoachingSignalsCollector(
            reportService, tdeeService, mealDailyIntake, weightLogRepository, memberRepository, AT_2AM);

    private void stubDependencies() {
        when(memberRepository.findById(anyLong()))
                .thenReturn(Optional.of(Member.signUp(Provider.KAKAO, "1", "a@b.c", "환희")));
        when(reportService.get(anyLong(), any(), any())).thenReturn(new ReportResponse(
                Period.WEEK, CALENDAR_TODAY.minusDays(6), CALENDAR_TODAY, 5, 1800, 2000, 3,
                BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, 50, 30, 20, 250, 150, 44,
                List.of(), List.of(), List.of()));
        when(tdeeService.get(anyLong()))
                .thenReturn(new TdeeResponse("OK", 2400, "ADAPTIVE", 2000, 1900, 14, 0.9));
        when(mealDailyIntake.byDate(anyLong(), any(), any(), any())).thenReturn(Map.of());
        when(weightLogRepository.findTopByMemberIdOrderByLogDateDesc(anyLong())).thenReturn(Optional.empty());
        when(weightLogRepository.findByMemberIdAndLogDateBetweenOrderByLogDateAsc(anyLong(), any(), any()))
                .thenReturn(List.of());
    }

    @Test
    @DisplayName("새벽 2시에도 체중 조회는 달력 날짜까지 포함한다 — 방금 기록한 오늘 체중이 빠지지 않도록")
    void weightQueriesUseCalendarDateAtDawn() {
        stubDependencies();

        collector.collect(1L);

        ArgumentCaptor<LocalDate> end = ArgumentCaptor.forClass(LocalDate.class);
        // 7일 추세와 연속일 두 번 조회한다 — 둘 다 달력 오늘까지여야 한다
        verify(weightLogRepository, times(2)).findByMemberIdAndLogDateBetweenOrderByLogDateAsc(
                anyLong(), any(), end.capture());

        assertThat(end.getAllValues()).containsOnly(CALENDAR_TODAY);
    }

    @Test
    @DisplayName("섭취 집계는 서비스 날짜(05시 경계)를 그대로 쓴다 — 새벽 2시면 전날")
    void intakeStillUsesServiceDay() {
        stubDependencies();

        collector.collect(1L);

        ArgumentCaptor<LocalDate> from = ArgumentCaptor.forClass(LocalDate.class);
        verify(mealDailyIntake).byDate(anyLong(), from.capture(), any(), any());

        assertThat(from.getValue()).isEqualTo(CALENDAR_TODAY.minusDays(1));
    }
}
