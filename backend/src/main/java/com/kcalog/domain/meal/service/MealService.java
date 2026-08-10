package com.kcalog.domain.meal.service;

import com.kcalog.domain.meal.dto.MealItemRequest;
import com.kcalog.domain.meal.dto.MealResponse;
import com.kcalog.domain.meal.dto.SaveMealRequest;
import com.kcalog.domain.meal.dto.UpdateMealRequest;
import com.kcalog.domain.meal.entity.Meal;
import com.kcalog.domain.meal.entity.MealItem;
import com.kcalog.domain.meal.repository.MealRepository;
import com.kcalog.global.storage.StorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.NoSuchElementException;

@Service
@RequiredArgsConstructor
public class MealService {

    private final MealRepository mealRepository;
    private final StorageService storageService;
    private final Clock clock;

    /** 저장 — imageKey가 있으면(AI 확인 저장) 사진을 연결한다. 수동 입력은 imageKey=null */
    @Transactional
    public MealResponse save(Long memberId, SaveMealRequest request, String imageKey) {
        Meal meal = Meal.record(
                memberId, request.eatenAt(), request.mealType(), request.source(),
                toItems(request.items()));
        if (imageKey != null) {
            meal.attachImage(imageKey);
        }
        return MealResponse.of(mealRepository.save(meal));
    }

    /** 날짜별 조회 — 해당 날짜의 현지 시간대 하루 구간 [00:00, 다음날 00:00)의 식사를 시각 순으로 */
    @Transactional(readOnly = true)
    public List<MealResponse> findByDate(Long memberId, LocalDate date) {
        DayRange range = DayRange.of(date, clock.getZone());
        return mealRepository.findByMemberIdAndEatenAtGreaterThanEqualAndEatenAtLessThanOrderByEatenAtAsc(
                        memberId, range.from(), range.to())
                .stream()
                .map(MealResponse::of)
                .toList();
    }

    @Transactional
    public MealResponse update(Long memberId, Long mealId, UpdateMealRequest request) {
        Meal meal = ownedMeal(memberId, mealId);
        meal.updateMeta(request.mealType(), request.eatenAt());
        if (request.items() != null) {
            meal.replaceItems(toItems(request.items())); // 항목 전체 교체 + 합계 재계산
        }
        return MealResponse.of(meal);
    }

    private List<MealItem> toItems(List<MealItemRequest> items) {
        return items.stream()
                .map(i -> MealItem.of(i.name(), i.kcal(), i.carbG(), i.proteinG(), i.fatG()))
                .toList();
    }

    @Transactional
    public void delete(Long memberId, Long mealId) {
        Meal meal = ownedMeal(memberId, mealId);
        String imageKey = meal.getImageKey();
        mealRepository.delete(meal);
        if (imageKey != null) {
            storageService.delete(imageKey); // 연결된 사진도 제거
        }
    }

    /** 소유권 검증 — 본인 것이 아니면(타인·부재) NoSuchElementException → 404 (존재 여부를 숨겨 IDOR 차단) */
    private Meal ownedMeal(Long memberId, Long mealId) {
        return mealRepository.findByIdAndMemberId(mealId, memberId)
                .orElseThrow(() -> new NoSuchElementException("식사 기록을 찾을 수 없습니다"));
    }
}
