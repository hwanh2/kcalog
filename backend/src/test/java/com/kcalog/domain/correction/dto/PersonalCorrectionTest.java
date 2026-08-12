package com.kcalog.domain.correction.dto;

import com.kcalog.domain.correction.dto.PersonalCorrection.Scaled;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 보정치를 AI가 낸 섭취량에 맞춰 조정하는 규칙.
 * 보정치는 "그때 먹은 양 기준의 총량"으로 저장되므로, 같은 단위일 때만 비례 조정할 수 있다.
 */
@DisplayName("개인 보정치 섭취량 스케일")
class PersonalCorrectionTest {

    /** 삶은달걀 2개 = 140kcal (탄 0.8 / 단 12.6 / 지 9.6) */
    private static PersonalCorrection egg() {
        return new PersonalCorrection("삶은달걀", "삶은달걀", 140,
                new BigDecimal("0.8"), new BigDecimal("12.6"), new BigDecimal("9.6"),
                new BigDecimal("2"), "개");
    }

    /** 수량·단위 없이 저장된 보정치(구 데이터·직접 입력) */
    private static PersonalCorrection legacy() {
        return new PersonalCorrection("김치찌개", "김치찌개", 400,
                new BigDecimal("30.0"), new BigDecimal("20.0"), new BigDecimal("18.0"), null, null);
    }

    @Nested
    @DisplayName("같은 단위")
    class SameUnit {

        @Test
        @DisplayName("절반을 먹었으면 영양값도 절반이 된다")
        void scalesDown() {
            Scaled scaled = egg().scaledTo(new BigDecimal("1"), "개");

            assertThat(scaled.kcal()).isEqualTo(70);
            assertThat(scaled.proteinG()).isEqualByComparingTo("6.3");
        }

        @Test
        @DisplayName("더 먹었으면 비례해 커진다")
        void scalesUp() {
            Scaled scaled = egg().scaledTo(new BigDecimal("3"), "개");

            assertThat(scaled.kcal()).isEqualTo(210);
            assertThat(scaled.proteinG()).isEqualByComparingTo("18.9");
        }

        @Test
        @DisplayName("같은 양이면 저장값 그대로")
        void sameAmount() {
            Scaled scaled = egg().scaledTo(new BigDecimal("2"), "개");

            assertThat(scaled.kcal()).isEqualTo(140);
        }

        @Test
        @DisplayName("단위 표기 차이(대소문자·공백)는 흡수한다")
        void normalizesUnit() {
            PersonalCorrection chicken = new PersonalCorrection("닭가슴살", "닭가슴살", 165,
                    BigDecimal.ZERO, new BigDecimal("31.0"), new BigDecimal("3.6"),
                    new BigDecimal("100"), "g");

            assertThat(chicken.scaledTo(new BigDecimal("180"), " G ").kcal()).isEqualTo(297);
        }
    }

    @Nested
    @DisplayName("스케일할 수 없을 때는 저장값을 그대로 쓴다")
    class Fallback {

        @Test
        @DisplayName("단위가 다르면 조정하지 않는다 — 환산 규칙이 없다")
        void differentUnit() {
            Scaled scaled = egg().scaledTo(new BigDecimal("1"), "조각");

            assertThat(scaled.kcal()).isEqualTo(140);
        }

        @Test
        @DisplayName("보정치에 수량이 없으면(구 데이터) 조정하지 않는다")
        void correctionWithoutQuantity() {
            Scaled scaled = legacy().scaledTo(new BigDecimal("1"), "인분");

            assertThat(scaled.kcal()).isEqualTo(400);
        }

        @Test
        @DisplayName("AI가 섭취량을 주지 않으면 조정하지 않는다")
        void itemWithoutAmount() {
            Scaled scaled = egg().scaledTo(null, "개");

            assertThat(scaled.kcal()).isEqualTo(140);
        }

        @Test
        @DisplayName("섭취량이 0 이하면 조정하지 않는다")
        void nonPositiveAmount() {
            assertThat(egg().scaledTo(BigDecimal.ZERO, "개").kcal()).isEqualTo(140);
        }
    }
}
