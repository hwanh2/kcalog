package com.kcalog.domain.weight.service;

import com.kcalog.domain.weight.dto.WeightRequest;
import com.kcalog.domain.weight.dto.WeightResponse;
import com.kcalog.domain.weight.repository.WeightLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class WeightService {

    private final WeightLogRepository weightLogRepository;
    private final Clock clock;

    /** 지정일(없으면 오늘) 체중을 upsert — 같은 날 재기록은 덮어쓴다 */
    @Transactional
    public WeightResponse record(Long memberId, WeightRequest request) {
        LocalDate date = request.logDate() != null ? request.logDate() : LocalDate.now(clock);
        weightLogRepository.upsert(memberId, date, request.weightKg());
        return new WeightResponse(date, request.weightKg());
    }

    @Transactional(readOnly = true)
    public List<WeightResponse> history(Long memberId, LocalDate from, LocalDate to) {
        return weightLogRepository.findByMemberIdAndLogDateBetweenOrderByLogDateAsc(memberId, from, to)
                .stream()
                .map(WeightResponse::of)
                .toList();
    }
}
