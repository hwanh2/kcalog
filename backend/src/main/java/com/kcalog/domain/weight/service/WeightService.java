package com.kcalog.domain.weight.service;

import com.kcalog.domain.member.entity.Member;
import com.kcalog.domain.member.repository.MemberRepository;
import com.kcalog.domain.weight.dto.BmiInfo;
import com.kcalog.domain.weight.dto.ProjectionInfo;
import com.kcalog.domain.weight.dto.ProjectionInfo.ProjectionStatus;
import com.kcalog.domain.weight.dto.RecordWeightRequest;
import com.kcalog.domain.weight.dto.WeightResponse;
import com.kcalog.domain.weight.dto.WeightSummaryResponse;
import com.kcalog.domain.weight.dto.WeightSummaryResponse.Point;
import com.kcalog.domain.weight.entity.WeightLog;
import com.kcalog.domain.weight.repository.WeightLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
public class WeightService {

    /** 표시 구간 시작점 EMA를 데우기 위해 앞으로 더 조회하는 버퍼(design D3) */
    private static final int SEED_BUFFER_DAYS = 30;

    private final WeightLogRepository weightLogRepository;
    private final MemberRepository memberRepository;
    private final Clock clock;

    /** 지정일(없으면 오늘) 체중을 upsert — 같은 날 재기록은 덮어쓴다.
     *  컬럼 스케일(NUMERIC(4,1)) 반올림이 응답에 반영되도록 저장 행을 재조회해 반환한다 */
    @Transactional
    public WeightResponse record(Long memberId, RecordWeightRequest request) {
        LocalDate date = request.logDate() != null ? request.logDate() : LocalDate.now(clock);
        weightLogRepository.upsert(memberId, date, request.weightKg());
        return weightLogRepository.findByMemberIdAndLogDate(memberId, date)
                .map(WeightResponse::of)
                .orElseThrow(() -> new NoSuchElementException("방금 저장한 체중 기록을 찾을 수 없습니다"));
    }

    @Transactional(readOnly = true)
    public List<WeightResponse> history(Long memberId, LocalDate from, LocalDate to) {
        return weightLogRepository.findByMemberIdAndLogDateBetweenOrderByLogDateAsc(memberId, from, to)
                .stream()
                .map(WeightResponse::of)
                .toList();
    }

    /** 체중 탭 요약 — EMA 추세선·BMI·연속 기록·목표 예상. 추세는 seed 버퍼로 데워 표시 구간만 반환한다. */
    @Transactional(readOnly = true)
    public WeightSummaryResponse summary(Long memberId, LocalDate from, LocalDate to) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new NoSuchElementException("회원을 찾을 수 없습니다"));
        BigDecimal target = member.getTargetWeightKg();

        List<WeightLog> logs = weightLogRepository.findByMemberIdAndLogDateBetweenOrderByLogDateAsc(
                memberId, from.minusDays(SEED_BUFFER_DAYS), to);
        if (logs.isEmpty()) {
            ProjectionInfo projection = target != null
                    ? ProjectionInfo.of(ProjectionStatus.INSUFFICIENT_DATA, target) : ProjectionInfo.noGoal();
            return new WeightSummaryResponse(List.of(), null, null, null, 0, projection);
        }

        int n = logs.size();
        double[] weights = new double[n];
        List<LocalDate> dates = new ArrayList<>(n);
        for (int i = 0; i < n; i++) {
            weights[i] = logs.get(i).getWeightKg().doubleValue();
            dates.add(logs.get(i).getLogDate());
        }
        double[] trend = WeightTrend.ema(weights, WeightTrend.DEFAULT_ALPHA);

        // 표시 구간(from 이후)만 점으로 반환 — seed 구간은 EMA를 데우는 데만 쓴다
        List<Point> points = new ArrayList<>();
        for (int i = 0; i < n; i++) {
            if (!dates.get(i).isBefore(from)) {
                points.add(new Point(dates.get(i), logs.get(i).getWeightKg(), round1(trend[i])));
            }
        }

        WeightLog latest = logs.get(n - 1);
        BmiInfo bmi = WeightStats.bmi(latest.getWeightKg(), member.getHeightCm());
        int streak = WeightStats.streak(dates);
        ProjectionInfo projection = WeightStats.project(dates, trend, target, latest.getLogDate());

        return new WeightSummaryResponse(points, latest.getWeightKg(), round1(trend[n - 1]),
                bmi, streak, projection);
    }

    private static BigDecimal round1(double v) {
        return BigDecimal.valueOf(v).setScale(1, RoundingMode.HALF_UP);
    }
}
