package com.kcalog.domain.food.service;

import com.kcalog.domain.food.dto.FavoriteMealResponse;
import com.kcalog.domain.food.dto.SaveFavoriteMealRequest;
import com.kcalog.domain.food.entity.MemberFavoriteMealItem;
import com.kcalog.domain.food.repository.MemberFavoriteMealRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * 같은 이름이 동시에 저장될 때의 처리 — 실제 동시성은 재현하기 어려우므로
 * "유니크 위반이 올라왔을 때 어떻게 하는가"를 쓰기 담당 빈을 대역으로 두고 확인한다.
 */
class FavoriteMealServiceRaceTest {

    private final MemberFavoriteMealRepository repository = mock(MemberFavoriteMealRepository.class);
    private final FavoriteMealWriter writer = mock(FavoriteMealWriter.class);
    private final FavoriteMealService service = new FavoriteMealService(repository, writer);

    private static final SaveFavoriteMealRequest REQUEST = new SaveFavoriteMealRequest("회사 점심 A", List.of(
            new SaveFavoriteMealRequest.Item("잡곡밥", new BigDecimal("1"), "공기", 300,
                    new BigDecimal("70"), new BigDecimal("7"), new BigDecimal("2"))));

    private static final FavoriteMealResponse SAVED = new FavoriteMealResponse(
            1L, "회사 점심 A", 1, 300, new BigDecimal("70"), new BigDecimal("7"), new BigDecimal("2"), List.of());

    @Test
    @DisplayName("이미 있으면 생성하지 않고 덮어쓴다")
    void overwritesWhenPresent() {
        when(writer.overwriteIfPresent(anyLong(), anyString(), anyString(), any()))
                .thenReturn(Optional.of(SAVED));

        assertThat(service.save(1L, REQUEST)).isEqualTo(SAVED);
        verify(writer, times(0)).create(anyLong(), anyString(), any());
    }

    @Test
    @DisplayName("생성 중 같은 이름이 먼저 만들어지면 실패 대신 덮어쓴다 — 뜻은 '이 이름으로 이 구성'이다")
    void fallsBackToOverwriteOnUniqueViolation() {
        when(writer.overwriteIfPresent(anyLong(), anyString(), anyString(), any()))
                .thenReturn(Optional.empty())   // 처음 볼 때는 없었다
                .thenReturn(Optional.of(SAVED)); // 경쟁에서 진 뒤 다시 보니 있다
        when(writer.create(anyLong(), anyString(), any()))
                .thenThrow(new DataIntegrityViolationException("uq_favorite_meal_member_name"));

        assertThat(service.save(1L, REQUEST)).isEqualTo(SAVED);
        verify(writer, times(2)).overwriteIfPresent(anyLong(), anyString(), anyString(), any());
    }

    @Test
    @DisplayName("유니크 위반인데 그 이름이 없으면 감추지 않고 올린다 — 다른 제약이 깨진 것이다")
    void rethrowsWhenNameStillMissing() {
        when(writer.overwriteIfPresent(anyLong(), anyString(), anyString(), any()))
                .thenReturn(Optional.empty());
        when(writer.create(anyLong(), anyString(), any()))
                .thenThrow(new DataIntegrityViolationException("다른 제약"));

        assertThatThrownBy(() -> service.save(1L, REQUEST))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    @DisplayName("상한 초과는 그대로 올린다 — 경쟁 처리와 섞이지 않는다")
    void limitExceptionPropagates() {
        when(writer.overwriteIfPresent(anyLong(), anyString(), anyString(), any()))
                .thenReturn(Optional.empty());
        when(writer.create(anyLong(), anyString(), any()))
                .thenThrow(new IllegalArgumentException("세트는 최대 50개까지 저장할 수 있어요"));

        assertThatThrownBy(() -> service.save(1L, REQUEST))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("50개");
    }

    @Test
    @DisplayName("항목 순서가 그대로 표시 순서가 된다")
    void keepsItemOrder() {
        when(writer.overwriteIfPresent(anyLong(), anyString(), anyString(), any())).thenReturn(Optional.of(SAVED));

        SaveFavoriteMealRequest two = new SaveFavoriteMealRequest("두 개", List.of(
                REQUEST.items().getFirst(),
                new SaveFavoriteMealRequest.Item("미역국", new BigDecimal("1"), "그릇", 120,
                        new BigDecimal("6"), new BigDecimal("16"), new BigDecimal("10"))));
        service.save(1L, two);

        var captor = org.mockito.ArgumentCaptor.forClass(List.class);
        verify(writer).overwriteIfPresent(anyLong(), anyString(), anyString(), captor.capture());
        @SuppressWarnings("unchecked")
        List<MemberFavoriteMealItem> items = captor.getValue();
        assertThat(items).extracting(MemberFavoriteMealItem::getSortOrder).containsExactly(0, 1);
        assertThat(items).extracting(MemberFavoriteMealItem::getName).containsExactly("잡곡밥", "미역국");
    }
}
