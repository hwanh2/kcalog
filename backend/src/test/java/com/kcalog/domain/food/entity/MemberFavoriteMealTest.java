package com.kcalog.domain.food.entity;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/** 끼니 세트의 순수 도메인 로직 — 합계·이름 정규화·구성 교체 (Spring 불필요) */
class MemberFavoriteMealTest {

    private static MemberFavoriteMealItem item(String name, int kcal, String carb, String protein, String fat, int order) {
        return MemberFavoriteMealItem.of(name, new BigDecimal("1"), "인분", kcal,
                new BigDecimal(carb), new BigDecimal(protein), new BigDecimal(fat), order);
    }

    @Test
    @DisplayName("합계는 항목의 합이다 — 저장하지 않고 그때그때 더한다")
    void totals() {
        MemberFavoriteMeal set = MemberFavoriteMeal.of(1L, "회사 점심 A", List.of(
                item("잡곡밥", 300, "70", "7", "2", 0),
                item("미역국", 120, "6", "16", "10", 1),
                item("계란찜", 180, "6", "20", "18", 2)));

        assertThat(set.totalKcal()).isEqualTo(600);
        assertThat(set.totalCarbG()).isEqualByComparingTo("82");
        assertThat(set.totalProteinG()).isEqualByComparingTo("43");
        assertThat(set.totalFatG()).isEqualByComparingTo("30");
    }

    @Test
    @DisplayName("항목이 없으면 합계는 0이다")
    void emptyTotals() {
        MemberFavoriteMeal set = MemberFavoriteMeal.of(1L, "빈 세트", List.of());

        assertThat(set.totalKcal()).isZero();
        assertThat(set.totalCarbG()).isEqualByComparingTo("0");
    }

    @Test
    @DisplayName("이름을 바꾸면 정규화명도 함께 바뀐다 — 어긋나면 중복 판정이 무너진다")
    void renameKeepsNormalizedInSync() {
        MemberFavoriteMeal set = MemberFavoriteMeal.of(1L, "회사 점심 A", List.of());

        set.rename("집 밥 B");

        assertThat(set.getName()).isEqualTo("집 밥 B");
        assertThat(set.getNameNormalized()).isEqualTo("집밥b"); // 공백 제거 + 소문자
    }

    @Test
    @DisplayName("띄어쓰기만 다른 이름은 같은 정규화명이 된다 — 즐겨찾기 음식과 같은 규칙")
    void normalizationAbsorbsSpacing() {
        MemberFavoriteMeal spaced = MemberFavoriteMeal.of(1L, "회사 점심 A", List.of());
        MemberFavoriteMeal tight = MemberFavoriteMeal.of(1L, "회사점심A", List.of());

        assertThat(spaced.getNameNormalized()).isEqualTo(tight.getNameNormalized());
    }

    @Test
    @DisplayName("구성을 갈아끼우면 이전 항목은 남지 않는다 — 같은 이름 재저장이 이 경로다")
    void replaceItems() {
        MemberFavoriteMeal set = MemberFavoriteMeal.of(1L, "회사 점심 A", List.of(
                item("잡곡밥", 300, "70", "7", "2", 0)));

        set.replaceItems(List.of(item("샐러드", 100, "8", "5", "7", 0)));

        assertThat(set.getItems()).singleElement()
                .extracting(MemberFavoriteMealItem::getName).isEqualTo("샐러드");
        assertThat(set.totalKcal()).isEqualTo(100);
    }

    @Test
    @DisplayName("소유자만 자기 세트로 인정된다")
    void ownership() {
        MemberFavoriteMeal set = MemberFavoriteMeal.of(1L, "회사 점심 A", List.of());

        assertThat(set.isOwnedBy(1L)).isTrue();
        assertThat(set.isOwnedBy(2L)).isFalse();
    }
}
