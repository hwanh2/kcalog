package com.kcalog.domain.member;

import com.kcalog.IntegrationTest;
import com.kcalog.domain.analysis.entity.AnalysisJob;
import com.kcalog.domain.analysis.repository.AnalysisJobRepository;
import com.kcalog.domain.auth.service.JwtService;
import com.kcalog.domain.auth.service.RefreshCookie;
import com.kcalog.domain.auth.service.RefreshTokenService;
import com.kcalog.domain.correction.entity.FoodCorrection;
import com.kcalog.domain.correction.repository.FoodCorrectionRepository;
import com.kcalog.domain.food.entity.MemberFavoriteMeal;
import com.kcalog.domain.food.entity.MemberFavoriteMealItem;
import com.kcalog.domain.food.repository.MemberFavoriteMealRepository;
import com.kcalog.domain.meal.entity.Meal;
import com.kcalog.domain.meal.entity.MealItem;
import com.kcalog.domain.meal.entity.MealSource;
import com.kcalog.domain.meal.entity.MealType;
import com.kcalog.domain.meal.repository.MealRepository;
import com.kcalog.domain.member.entity.Member;
import com.kcalog.domain.member.entity.Provider;
import com.kcalog.domain.member.repository.MemberRepository;
import com.kcalog.domain.weight.repository.WeightLogRepository;
import com.kcalog.support.InMemoryStorageService;
import com.kcalog.global.storage.StorageService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** 회원 탈퇴. 서비스가 트랜잭션 없이 지우므로 @Transactional 롤백을 쓰지 않는다 */
@IntegrationTest
class MemberWithdrawalIntegrationTest {

    /** member_id를 가진 모든 테이블. 새 테이블이 생기면 V24처럼 CASCADE를 걸고 여기에도 더한다 */
    private static final List<String> MEMBER_TABLES = List.of(
            "refresh_token", "weight_log", "meal", "analysis_usage", "analysis_job", "food_correction",
            "coaching_message", "coaching_chat_message", "coaching_chat_usage", "member_favorite_food",
            "member_favorite_meal", "feedback", "praise");

    @Autowired MockMvc mockMvc;
    @Autowired MemberRepository memberRepository;
    @Autowired MealRepository mealRepository;
    @Autowired AnalysisJobRepository analysisJobRepository;
    @Autowired WeightLogRepository weightLogRepository;
    @Autowired FoodCorrectionRepository foodCorrectionRepository;
    @Autowired MemberFavoriteMealRepository favoriteMealRepository;
    @Autowired RefreshTokenService refreshTokenService;
    @Autowired JwtService jwtService;
    @Autowired StorageService storageService;
    @Autowired JdbcTemplate jdbcTemplate;
    @Autowired PlatformTransactionManager transactionManager;

    @Test
    @DisplayName("탈퇴하면 회원과 모든 기록, 저장된 사진이 지워지고 refresh 쿠키가 만료된다")
    void withdrawDeletesEverything() throws Exception {
        Member member = memberRepository.save(Member.signUp(Provider.KAKAO, "kakao-withdraw", null, "탈퇴"));
        Long id = member.getId();

        String mealPhoto = storageService.put(id, new byte[]{1}, "image/jpeg");
        Meal meal = Meal.record(id, Instant.now(), MealType.LUNCH, MealSource.AI,
                List.of(MealItem.of("김밥", 400, new BigDecimal("60"), new BigDecimal("10"), new BigDecimal("10"))));
        meal.attachImage(mealPhoto);
        mealRepository.save(meal);
        String pendingPhoto = storageService.put(id, new byte[]{2}, "image/jpeg");
        analysisJobRepository.save(AnalysisJob.analyzing(id, pendingPhoto, null));
        new TransactionTemplate(transactionManager).executeWithoutResult(tx ->
                weightLogRepository.upsert(id, LocalDate.now(), new BigDecimal("70.0")));
        foodCorrectionRepository.save(FoodCorrection.of(id, "김밥", 400,
                new BigDecimal("60"), new BigDecimal("10"), new BigDecimal("10"), null, null));
        favoriteMealRepository.save(MemberFavoriteMeal.of(id, "점심", List.of(MemberFavoriteMealItem.of(
                "김밥", new BigDecimal("1"), "줄", 400,
                new BigDecimal("60"), new BigDecimal("10"), new BigDecimal("10"), 0))));
        refreshTokenService.issue(id);

        mockMvc.perform(delete("/api/members/me").header("Authorization", "Bearer " + jwtService.issueAccessToken(id)))
                .andExpect(status().isNoContent())
                .andExpect(cookie().maxAge(RefreshCookie.NAME, 0));

        assertThat(memberRepository.findById(id)).isEmpty();
        for (String table : MEMBER_TABLES) {
            Integer rows = jdbcTemplate.queryForObject(
                    "select count(*) from " + table + " where member_id = ?", Integer.class, id);
            assertThat(rows).as(table).isZero();
        }
        InMemoryStorageService fake = (InMemoryStorageService) storageService;
        assertThat(fake.has(mealPhoto)).isFalse();
        assertThat(fake.has(pendingPhoto)).isFalse();
    }

    @Test
    @DisplayName("인증 없이 탈퇴 요청 → 401")
    void requiresAuth() throws Exception {
        mockMvc.perform(delete("/api/members/me")).andExpect(status().isUnauthorized());
    }
}
