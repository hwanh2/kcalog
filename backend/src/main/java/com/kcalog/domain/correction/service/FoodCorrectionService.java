package com.kcalog.domain.correction.service;

import com.kcalog.domain.correction.dto.PersonalCorrection;
import com.kcalog.domain.correction.entity.FoodCorrection;
import com.kcalog.domain.correction.entity.FoodNames;
import com.kcalog.domain.correction.repository.FoodCorrectionRepository;
import com.kcalog.domain.meal.dto.MealAnalysisResponse;
import com.kcalog.domain.meal.dto.MealAnalysisResponse.AnalyzedItem;
import com.kcalog.global.common.AppProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

/**
 * 개인 영양 보정치 (차별점 #1). 정정+기억 저장 시 upsert(최신값 덮어쓰기), 분석 시 주입·덮어쓰기 재료를 제공한다(design D0/D5).
 */
@Service
@RequiredArgsConstructor
public class FoodCorrectionService {

    private final FoodCorrectionRepository repository;
    private final AppProperties props;

    /** 정정값 저장 — 정규화명으로 매칭해 없으면 생성, 있으면 최신값 덮어쓰기(design D2). 호출자 트랜잭션에 참여. */
    @Transactional
    public void upsert(Long memberId, String name, int kcal,
                       BigDecimal carbG, BigDecimal proteinG, BigDecimal fatG) {
        String normalized = FoodNames.normalize(name);
        repository.findByMemberIdAndFoodNameNormalized(memberId, normalized)
                .ifPresentOrElse(
                        existing -> existing.updateNutrition(name, kcal, carbG, proteinG, fatG),
                        () -> repository.save(FoodCorrection.of(memberId, name, kcal, carbG, proteinG, fatG)));
    }

    /** 분석 주입·덮어쓰기용 — 최근 갱신 순 상한 개수. 상한 0이면 빈 목록. */
    @Transactional(readOnly = true)
    public List<PersonalCorrection> recentFor(Long memberId) {
        int limit = props.analysis().correctionInjectLimit();
        if (limit <= 0) {
            return List.of();
        }
        return repository.findByMemberIdOrderByUpdatedAtDesc(memberId, Limit.of(limit))
                .stream()
                .map(PersonalCorrection::from)
                .toList();
    }

    /**
     * 코드 결정적 덮어쓰기(A) — 응답 항목 중 정규화 이름이 보정치와 일치하면 저장값으로 대체하고 corrected 표시.
     * AI 추정값이 달라도 명시적으로 고친 값의 정확 재현을 보장한다. 보정치가 없으면 원본 그대로.
     */
    public MealAnalysisResponse applyOverride(MealAnalysisResponse result, List<PersonalCorrection> corrections) {
        if (corrections.isEmpty() || !result.foodFound()) {
            return result;
        }
        Map<String, PersonalCorrection> byName = corrections.stream()
                .collect(java.util.stream.Collectors.toMap(
                        PersonalCorrection::normalizedName, Function.identity(), (a, b) -> a));
        List<AnalyzedItem> items = result.items().stream()
                .map(item -> {
                    PersonalCorrection c = byName.get(FoodNames.normalize(item.name()));
                    return c == null ? item : item.overriddenWith(c.kcal(), c.carbG(), c.proteinG(), c.fatG());
                })
                .toList();
        return new MealAnalysisResponse(result.foodFound(), items, result.overallConfidence(), result.notes());
    }
}
