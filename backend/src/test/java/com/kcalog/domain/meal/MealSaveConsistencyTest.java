package com.kcalog.domain.meal;

import com.kcalog.IntegrationTest;
import com.kcalog.domain.analysis.entity.AnalysisJob;
import com.kcalog.domain.analysis.repository.AnalysisJobRepository;
import com.kcalog.domain.meal.dto.MealItemRequest;
import com.kcalog.domain.meal.dto.SaveMealRequest;
import com.kcalog.domain.meal.entity.Meal;
import com.kcalog.domain.meal.entity.MealSource;
import com.kcalog.domain.meal.entity.MealType;
import com.kcalog.domain.meal.repository.MealRepository;
import com.kcalog.domain.meal.service.MealService;
import com.kcalog.domain.member.entity.Member;
import com.kcalog.domain.member.entity.Provider;
import com.kcalog.domain.member.repository.MemberRepository;
import com.kcalog.global.storage.StorageService;
import com.kcalog.support.InMemoryStorageService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

/**
 * 🔴① 회귀 — 분석 작업 인수(행 삭제)와 meal 저장이 한 트랜잭션이라, 저장 실패 시 작업 삭제도 롤백돼야 한다.
 * MealRepository.save를 실패시켜, 작업과 사진이 살아남는지(유실 없음) 검증. @Transactional 없이 수동 정리.
 */
@IntegrationTest
class MealSaveConsistencyTest {

    @Autowired
    MealService mealService;
    @Autowired
    MemberRepository memberRepository;
    @Autowired
    AnalysisJobRepository jobRepository;
    @Autowired
    StorageService storageService;

    @MockitoBean
    MealRepository mealRepository;

    Member member;

    @BeforeEach
    void setUp() {
        member = memberRepository.save(Member.signUp(Provider.KAKAO, "kakao-cons", "c@kakao.com", "정합"));
    }

    @AfterEach
    void tearDown() {
        jobRepository.deleteAll();
        memberRepository.deleteAll();
    }

    @Test
    @DisplayName("meal 저장 실패 시 — 인수한 분석 작업 삭제가 롤백되어 작업·사진이 보존된다")
    void saveFailureRollsBackJobConsumption() {
        String key = storageService.put(member.getId(), "jpeg".getBytes(), "image/jpeg");
        AnalysisJob job = jobRepository.save(AnalysisJob.analyzing(member.getId(), key));
        when(mealRepository.save(any(Meal.class))).thenThrow(new RuntimeException("DB 저장 실패"));

        SaveMealRequest request = new SaveMealRequest(
                Instant.parse("2026-08-06T03:30:00Z"), MealType.LUNCH, MealSource.AI,
                List.of(new MealItemRequest("김치찌개", 400,
                        new BigDecimal("30.0"), new BigDecimal("20.0"), new BigDecimal("18.0"), false)),
                job.getId());

        assertThatThrownBy(() -> mealService.save(member.getId(), request))
                .isInstanceOf(RuntimeException.class);

        // 작업 삭제가 롤백되어 그대로 남고(결과 유실 없음), 사진도 살아있다
        assertThat(jobRepository.findById(job.getId())).isPresent();
        assertThat(((InMemoryStorageService) storageService).has(key)).isTrue();
    }
}
