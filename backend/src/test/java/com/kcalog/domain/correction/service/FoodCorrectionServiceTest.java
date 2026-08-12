package com.kcalog.domain.correction.service;

import com.kcalog.domain.correction.dto.PersonalCorrection;
import com.kcalog.domain.meal.dto.MealAnalysisResponse;
import com.kcalog.domain.meal.dto.MealAnalysisResponse.AnalyzedItem;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** applyOverride 순수 로직 — Spring 없이 검증(코드 결정적 덮어쓰기 A) */
class FoodCorrectionServiceTest {

    // 리포지토리·설정은 applyOverride에 쓰이지 않아 null로 둔다
    private final FoodCorrectionService service = new FoodCorrectionService(null, null);

    private AnalyzedItem item(String name, int kcal) {
        return new AnalyzedItem(name, kcal,
                new BigDecimal("10.0"), new BigDecimal("10.0"), new BigDecimal("10.0"),
                new BigDecimal("100"), "g", null, false);
    }

    private PersonalCorrection correction(String display, int kcal) {
        return PersonalCorrection.from(com.kcalog.domain.correction.entity.FoodCorrection.of(
                1L, display, kcal, new BigDecimal("15.0"), new BigDecimal("32.0"), new BigDecimal("30.0")));
    }

    @Test
    @DisplayName("정규화 이름이 일치하는 항목은 보정값으로 대체되고 corrected=true")
    void overridesMatchingItem() {
        MealAnalysisResponse result = new MealAnalysisResponse(
                true, List.of(item(" 김치  찌개 ", 400)), new BigDecimal("0.8"), null);

        MealAnalysisResponse out = service.applyOverride(result, List.of(correction("김치찌개", 520)));

        AnalyzedItem overridden = out.items().get(0);
        assertThat(overridden.corrected()).isTrue();
        assertThat(overridden.kcal()).isEqualTo(520);
        assertThat(overridden.carbG()).isEqualByComparingTo("15.0");
        assertThat(overridden.name()).isEqualTo(" 김치  찌개 "); // 표시 이름은 원본 유지
    }

    @Test
    @DisplayName("보정치가 없는 항목은 원본 그대로(corrected=false)")
    void keepsUnmatchedItem() {
        MealAnalysisResponse result = new MealAnalysisResponse(
                true, List.of(item("제육볶음", 600)), new BigDecimal("0.8"), null);

        MealAnalysisResponse out = service.applyOverride(result, List.of(correction("김치찌개", 520)));

        assertThat(out.items().get(0).corrected()).isFalse();
        assertThat(out.items().get(0).kcal()).isEqualTo(600);
    }

    @Test
    @DisplayName("보정 이력이 비면 결과를 그대로 반환")
    void noCorrectionsReturnsSame() {
        MealAnalysisResponse result = new MealAnalysisResponse(
                true, List.of(item("김치찌개", 400)), new BigDecimal("0.8"), null);

        assertThat(service.applyOverride(result, List.of())).isSameAs(result);
    }
}
