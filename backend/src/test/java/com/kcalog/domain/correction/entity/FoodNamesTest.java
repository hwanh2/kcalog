package com.kcalog.domain.correction.entity;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class FoodNamesTest {

    @Test
    @DisplayName("앞뒤 공백을 제거한다")
    void trimsSurroundingWhitespace() {
        assertThat(FoodNames.normalize("  김치찌개 ")).isEqualTo("김치찌개");
    }

    @Test
    @DisplayName("내부 공백을 모두 제거한다 — 띄어쓰기 불일치 흡수")
    void removesInnerWhitespace() {
        assertThat(FoodNames.normalize("김치  찌개")).isEqualTo("김치찌개");
        assertThat(FoodNames.normalize("김치\t찌개")).isEqualTo("김치찌개");
    }

    @Test
    @DisplayName("영문은 소문자로 통일한다")
    void lowercasesLatin() {
        assertThat(FoodNames.normalize("Ice Cream")).isEqualTo("icecream");
    }

    @Test
    @DisplayName("띄어쓰기가 달라도 같은 정규화 결과로 매칭된다")
    void matchesDespiteSpacing() {
        assertThat(FoodNames.normalize(" 김치  찌개 ")).isEqualTo(FoodNames.normalize("김치찌개"));
    }

    @Test
    @DisplayName("null·빈 문자열은 빈 문자열로")
    void handlesNull() {
        assertThat(FoodNames.normalize(null)).isEmpty();
        assertThat(FoodNames.normalize("   ")).isEmpty();
    }
}
