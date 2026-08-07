package com.kcalog.domain.meal.controller;

import com.kcalog.domain.meal.dto.MealAnalysisResponse;
import com.kcalog.domain.meal.dto.MealResponse;
import com.kcalog.domain.meal.dto.SaveMealRequest;
import com.kcalog.domain.meal.dto.UpdateMealRequest;
import com.kcalog.domain.meal.service.MealAnalysisService;
import com.kcalog.domain.meal.service.MealService;
import com.kcalog.global.common.LoginMemberId;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/meals")
@RequiredArgsConstructor
public class MealController {

    private final MealService mealService;
    private final MealAnalysisService mealAnalysisService;

    /** 사진 분석 — 결과만 반환하고 저장하지 않는다. 프론트가 확인·수정 후 POST /api/meals로 저장 */
    @PostMapping("/analyze")
    public MealAnalysisResponse analyze(@LoginMemberId Long memberId,
                                        @RequestParam("image") MultipartFile image) throws IOException {
        if (image.isEmpty()) {
            throw new IllegalArgumentException("이미지가 비어 있습니다");
        }
        return mealAnalysisService.analyze(memberId, image.getBytes(), image.getContentType());
    }

    @PostMapping
    public MealResponse save(@LoginMemberId Long memberId, @Valid @RequestBody SaveMealRequest request) {
        return mealService.save(memberId, request);
    }

    @GetMapping
    public List<MealResponse> byDate(@LoginMemberId Long memberId,
                                     @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return mealService.findByDate(memberId, date);
    }

    @PatchMapping("/{id}")
    public MealResponse update(@LoginMemberId Long memberId, @PathVariable Long id,
                               @Valid @RequestBody UpdateMealRequest request) {
        return mealService.update(memberId, id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@LoginMemberId Long memberId, @PathVariable Long id) {
        mealService.delete(memberId, id);
    }
}
