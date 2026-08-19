package com.kcalog.domain.coaching;

import com.kcalog.IntegrationTest;
import com.kcalog.domain.auth.service.JwtService;
import com.kcalog.domain.coaching.entity.Praise;
import com.kcalog.domain.coaching.entity.PraiseKind;
import com.kcalog.domain.coaching.repository.PraiseRepository;
import com.kcalog.domain.meal.entity.Meal;
import com.kcalog.domain.meal.entity.MealItem;
import com.kcalog.domain.meal.entity.MealSource;
import com.kcalog.domain.meal.entity.MealType;
import com.kcalog.domain.meal.repository.MealRepository;
import com.kcalog.domain.meal.service.OpenAiClient;
import com.kcalog.domain.member.entity.ActivityLevel;
import com.kcalog.domain.member.entity.Gender;
import com.kcalog.domain.member.entity.Goal;
import com.kcalog.domain.member.entity.Member;
import com.kcalog.domain.member.entity.Provider;
import com.kcalog.domain.member.repository.MemberRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** 칭찬 — 감지·중복 방지·읽음 처리·문구 생성 실패 폴백. OpenAI는 목킹. */
@IntegrationTest
@Transactional
class PraiseIntegrationTest {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    @Autowired
    MockMvc mockMvc;
    @Autowired
    MemberRepository memberRepository;
    @Autowired
    MealRepository mealRepository;
    @Autowired
    PraiseRepository praiseRepository;
    @Autowired
    JwtService jwtService;

    @MockitoBean
    OpenAiClient openAiClient;

    Member member;
    String bearer;

    @BeforeEach
    void setUp() {
        member = memberRepository.save(Member.signUp(Provider.KAKAO, "kakao-praise", "praise@kakao.com", "칭찬"));
        member.completeOnboarding(Gender.MALE, 1996, new BigDecimal("175"),
                ActivityLevel.MID, Goal.CUT, new BigDecimal("65"), 1900);
        memberRepository.save(member);
        bearer = "Bearer " + jwtService.issueAccessToken(member.getId());
        when(openAiClient.complete(any())).thenReturn("3일 연속이에요. 잘하고 있어요");
    }

    private void mealOn(LocalDate date, int kcal) {
        mealRepository.save(Meal.record(member.getId(), date.atTime(12, 0).atZone(KST).toInstant(),
                MealType.LUNCH, MealSource.MANUAL,
                List.of(MealItem.of("식사", kcal, new BigDecimal("50.0"),
                        new BigDecimal("30.0"), new BigDecimal("20.0")))));
    }

    /** 연속 기록만 잡히게 한다 — 첫걸음은 이미 받은 것으로 미리 저장해 둔다 */
    private void alreadyPraisedFirstSteps() {
        praiseRepository.save(Praise.of(member.getId(), PraiseKind.FIRST_MEAL, "first:meal", "첫 기록", "RULE"));
        praiseRepository.save(Praise.of(member.getId(), PraiseKind.FIRST_WEIGHT, "first:weight", "첫 체중", "RULE"));
        praiseRepository.findByMemberIdAndDismissedAtIsNullOrderByCreatedAtAsc(member.getId())
                .forEach(praise -> praise.dismiss(java.time.Instant.now()));
    }

    @Test
    @DisplayName("칭찬할 일이 없으면 praise가 null이다")
    void nothingToPraise() throws Exception {
        mockMvc.perform(get("/api/coach/praise").header("Authorization", bearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.praise").doesNotExist());
    }

    @Test
    @DisplayName("첫 식사 기록을 남기면 첫걸음을 칭찬한다")
    void firstMeal() throws Exception {
        mealOn(LocalDate.now(KST), 1500);

        mockMvc.perform(get("/api/coach/praise").header("Authorization", bearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.praise.kind").value("FIRST_MEAL"));
    }

    @Test
    @DisplayName("사흘 연속 기록하면 연속 칭찬이 나온다")
    void mealStreak() throws Exception {
        alreadyPraisedFirstSteps();
        LocalDate today = LocalDate.now(KST);
        for (int i = 0; i < 3; i++) {
            mealOn(today.minusDays(i), 1500);
        }

        mockMvc.perform(get("/api/coach/praise").header("Authorization", bearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.praise.kind").value("MEAL_STREAK"))
                .andExpect(jsonPath("$.praise.message").value("3일 연속이에요. 잘하고 있어요"));
    }

    @Test
    @DisplayName("닫으면 다시 나오지 않는다")
    void dismissed() throws Exception {
        mealOn(LocalDate.now(KST), 1500);
        String id = praiseId();

        mockMvc.perform(post("/api/coach/praise/" + id + "/dismiss").header("Authorization", bearer))
                .andExpect(status().isNoContent());

        // 첫걸음을 닫았으니 남은 것은 없다 — 사흘을 채우지 않았고 어제 기록도 없다
        mockMvc.perform(get("/api/coach/praise").header("Authorization", bearer))
                .andExpect(jsonPath("$.praise").doesNotExist());
    }

    @Test
    @DisplayName("같은 이정표에 다시 도달해도 칭찬하지 않는다")
    void sameMilestoneAgain() throws Exception {
        alreadyPraisedFirstSteps();
        LocalDate today = LocalDate.now(KST);
        for (int i = 0; i < 3; i++) {
            mealOn(today.minusDays(i), 1500);
        }
        // 사흘 연속을 칭찬받고 닫는다
        String id = praiseId();
        mockMvc.perform(post("/api/coach/praise/" + id + "/dismiss").header("Authorization", bearer))
                .andExpect(status().isNoContent());

        // 연속이 이어져도 3일 이정표는 이미 받았다
        mockMvc.perform(get("/api/coach/praise").header("Authorization", bearer))
                .andExpect(jsonPath("$.praise").doesNotExist());
        assertThat(praiseRepository.findByMemberIdAndDedupeKey(member.getId(), "meal-streak:3")).isPresent();
    }

    @Test
    @DisplayName("문구 생성이 실패해도 규칙 문구로 칭찬하고, 다시 조회할 때 생성을 되풀이하지 않는다")
    void fallbackWhenGenerationFails() throws Exception {
        when(openAiClient.complete(any())).thenThrow(new IllegalStateException("boom"));
        mealOn(LocalDate.now(KST), 1500);

        mockMvc.perform(get("/api/coach/praise").header("Authorization", bearer))
                .andExpect(jsonPath("$.praise.message").value("첫 기록이에요. 잘 오셨어요"));
        assertThat(praiseRepository.findByMemberIdAndDedupeKey(member.getId(), "first:meal"))
                .get()
                .extracting(Praise::getSource)
                .isEqualTo("RULE");

        // 두 번째 조회는 저장된 것을 그대로 준다
        org.mockito.Mockito.clearInvocations(openAiClient);
        mockMvc.perform(get("/api/coach/praise").header("Authorization", bearer))
                .andExpect(jsonPath("$.praise.message").value("첫 기록이에요. 잘 오셨어요"));
        verify(openAiClient, never()).complete(any());
    }

    @Test
    @DisplayName("안 읽은 칭찬이 있으면 감지가 돌지 않는다")
    void pendingSkipsDetection() throws Exception {
        mealOn(LocalDate.now(KST), 1500);
        mockMvc.perform(get("/api/coach/praise").header("Authorization", bearer))
                .andExpect(status().isOk());

        org.mockito.Mockito.clearInvocations(openAiClient);
        mockMvc.perform(get("/api/coach/praise").header("Authorization", bearer))
                .andExpect(status().isOk());

        verify(openAiClient, never()).complete(any());
    }

    @Test
    @DisplayName("남의 칭찬은 닫을 수 없다")
    void cannotDismissOthers() throws Exception {
        Member other = memberRepository.save(
                Member.signUp(Provider.KAKAO, "kakao-other", "other@kakao.com", "남"));
        Praise theirs = praiseRepository.save(
                Praise.of(other.getId(), PraiseKind.FIRST_MEAL, "first:meal", "첫 기록", "RULE"));

        mockMvc.perform(post("/api/coach/praise/" + theirs.getId() + "/dismiss")
                        .header("Authorization", bearer))
                .andExpect(status().isNotFound());

        assertThat(praiseRepository.findById(theirs.getId()))
                .get()
                .extracting(Praise::isDismissed)
                .isEqualTo(false);
    }

    @Test
    @DisplayName("로그인하지 않으면 칭찬을 볼 수 없다")
    void requiresLogin() throws Exception {
        mockMvc.perform(get("/api/coach/praise")).andExpect(status().isUnauthorized());
    }

    /** 지금 걸려 있는 칭찬의 id */
    private String praiseId() throws Exception {
        String body = mockMvc.perform(get("/api/coach/praise").header("Authorization", bearer))
                .andReturn().getResponse().getContentAsString();
        Map<?, ?> parsed = new com.fasterxml.jackson.databind.ObjectMapper().readValue(body, Map.class);
        return String.valueOf(((Map<?, ?>) parsed.get("praise")).get("id"));
    }
}
