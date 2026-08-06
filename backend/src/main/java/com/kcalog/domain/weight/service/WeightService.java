package com.kcalog.domain.weight.service;

import com.kcalog.domain.weight.dto.RecordWeightRequest;
import com.kcalog.domain.weight.dto.WeightResponse;
import com.kcalog.domain.weight.repository.WeightLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
public class WeightService {

    private final WeightLogRepository weightLogRepository;
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
}
