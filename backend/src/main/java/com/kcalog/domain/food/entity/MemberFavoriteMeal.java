package com.kcalog.domain.food.entity;

import com.kcalog.domain.correction.entity.FoodNames;
import com.kcalog.global.common.BaseEntity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.function.Function;

/**
 * 끼니 세트 — 음식 여러 개를 이름 붙인 한 덩어리로 보관한다("회사 점심 A").
 *
 * <p><b>먹은 기록(meal)이 아니라 틀이다.</b> 집계(대시보드·리포트)는 meal만 훑으므로 세트를
 * 저장해도 섭취량이 늘지 않는다. 담을 때 비로소 meal이 만들어진다(design D1).
 *
 * <p>매칭 키는 정규화된 이름(회원·정규화명 유니크)이라 같은 이름으로 다시 저장하면
 * {@link #rename}·{@link #replaceItems}로 구성을 갈아끼운다.
 */
@Entity
@Table(name = "member_favorite_meal")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MemberFavoriteMeal extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long memberId;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "name_normalized", nullable = false, length = 100)
    private String nameNormalized;

    // 애그리거트 내부 — 단방향 @OneToMany + join column, cascade·orphanRemoval로 생명주기를 세트가 관리
    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    @JoinColumn(name = "favorite_meal_id", nullable = false)
    @OrderBy("sortOrder ASC")
    private final List<MemberFavoriteMealItem> items = new ArrayList<>();

    private MemberFavoriteMeal(Long memberId, String name) {
        this.memberId = memberId;
        rename(name);
    }

    public static MemberFavoriteMeal of(Long memberId, String name, List<MemberFavoriteMealItem> items) {
        MemberFavoriteMeal meal = new MemberFavoriteMeal(memberId, name);
        meal.replaceItems(items);
        return meal;
    }

    /** 표시 이름 갱신 — 정규화명도 함께 바꾼다(둘이 어긋나면 중복 판정이 무너진다) */
    public void rename(String name) {
        this.name = name;
        this.nameNormalized = FoodNames.normalize(name);
    }

    /** 구성 전체 교체 — 같은 이름 재저장(덮어쓰기)이 이 경로를 쓴다 */
    public void replaceItems(List<MemberFavoriteMealItem> newItems) {
        items.clear();
        items.addAll(newItems);
    }

    public boolean isOwnedBy(Long memberId) {
        return this.memberId.equals(memberId);
    }

    /**
     * 합계는 저장하지 않고 그때그때 더한다 — 세트는 목록에서만 쓰이고 개수가 적어
     * 비정규화 컬럼을 두면 항목과 어긋날 위험만 는다(meal은 집계 대상이라 사정이 다르다).
     */
    public int totalKcal() {
        return items.stream().mapToInt(MemberFavoriteMealItem::getKcal).sum();
    }

    public BigDecimal totalCarbG() {
        return sum(MemberFavoriteMealItem::getCarbG);
    }

    public BigDecimal totalProteinG() {
        return sum(MemberFavoriteMealItem::getProteinG);
    }

    public BigDecimal totalFatG() {
        return sum(MemberFavoriteMealItem::getFatG);
    }

    private BigDecimal sum(Function<MemberFavoriteMealItem, BigDecimal> field) {
        return items.stream().map(field).reduce(BigDecimal.ZERO, BigDecimal::add);
    }
}
