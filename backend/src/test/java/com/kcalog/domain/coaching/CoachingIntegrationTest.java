package com.kcalog.domain.coaching;

import com.kcalog.IntegrationTest;
import com.kcalog.domain.auth.service.JwtService;
import com.kcalog.domain.coaching.entity.CoachingMessage;
import com.kcalog.domain.coaching.repository.CoachingChatUsageRepository;
import com.kcalog.domain.coaching.repository.CoachingMessageRepository;
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
import com.kcalog.global.common.AppProperties;
import com.kcalog.domain.weight.repository.WeightLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.task.TaskExecutor;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import com.kcalog.global.common.ServiceDay;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

import org.springframework.test.web.servlet.MvcResult;

import java.util.function.Consumer;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** AI PT 코칭 — 브리핑 생성·캐시·폴백·데이터부족, 채팅 응답·히스토리·초기화·상한·인가. OpenAI HTTP는 목킹 */
@IntegrationTest
@Transactional
class CoachingIntegrationTest {

    private static final ZoneId KST = ZoneId.of("Asia/Seoul");

    @Autowired
    MockMvc mockMvc;
    @Autowired
    MemberRepository memberRepository;
    @Autowired
    MealRepository mealRepository;
    @Autowired
    WeightLogRepository weightLogRepository;
    @Autowired
    CoachingChatUsageRepository chatUsageRepository;
    @Autowired
    CoachingMessageRepository briefingRepository;
    @Autowired
    JwtService jwtService;
    @Autowired
    AppProperties props;
    @Autowired
    Clock clock;

    @MockitoBean
    OpenAiClient openAiClient;

    // 스트림 실행기를 동기로 대체 — 백그라운드 스레드 없이 요청 스레드(=테스트 트랜잭션)에서 완료
    @MockitoBean(name = "coachStreamExecutor")
    TaskExecutor coachStreamExecutor;

    Member member;
    String bearer;

    @BeforeEach
    void setUp() {
        member = memberRepository.save(Member.signUp(Provider.KAKAO, "kakao-coach", "coach@kakao.com", "코치테스트"));
        member.completeOnboarding(Gender.MALE, 1996, new BigDecimal("175"),
                ActivityLevel.MID, Goal.CUT, new BigDecimal("65"), 1900, false);
        memberRepository.save(member);
        bearer = "Bearer " + jwtService.issueAccessToken(member.getId());

        // execute(runnable) → 즉시 실행(동기)
        org.mockito.Mockito.doAnswer(inv -> {
            inv.getArgument(0, Runnable.class).run();
            return null;
        }).when(coachStreamExecutor).execute(org.mockito.ArgumentMatchers.any());
    }

    /** stream(body, onToken) 스텁 — 토큰 하나로 흘리고 전체 텍스트 반환 */
    private void stubStream(String text) {
        when(openAiClient.stream(any(), any())).thenAnswer(inv -> {
            Consumer<String> onToken = inv.getArgument(1);
            onToken.accept(text);
            return text;
        });
    }

    /** SSE POST 수행 → 스트림 완료 후 asyncDispatch로 최종 응답 본문 반환 */
    private String streamChat(String contentJson) throws Exception {
        MvcResult started = mockMvc.perform(post("/api/coach/messages").header("Authorization", bearer)
                .contentType("application/json").content(contentJson)).andReturn();
        return mockMvc.perform(asyncDispatch(started)).andReturn()
                .getResponse().getContentAsString(java.nio.charset.StandardCharsets.UTF_8);
    }

    private void mealOn(LocalDate date, int kcal) {
        Meal meal = Meal.record(member.getId(), date.atTime(12, 0).atZone(KST).toInstant(),
                MealType.LUNCH, MealSource.MANUAL,
                List.of(MealItem.of("식사", kcal, new BigDecimal("50.0"), new BigDecimal("30.0"), new BigDecimal("20.0"))));
        mealRepository.save(meal);
    }

    private void seedRecentData() {
        LocalDate today = LocalDate.now(KST);
        for (int i = 0; i < 5; i++) {
            mealOn(today.minusDays(i), 1800);
        }
        weightLogRepository.upsert(member.getId(), today, new BigDecimal("70.0"));
    }

    private static final String LLM_BRIEFING = """
            {"headline":"오늘도 좋아요","message":"최근 흐름이 안정적이에요. 오늘은 단백질에 집중해봐요.",
             "recommendations":[
               {"category":"meal","title":"점심 단백질","detail":"닭가슴살 샐러드 추천"},
               {"category":"hydration","title":"수분","detail":"물 1L 더 마시기"}]}
            """;

    @Test
    @DisplayName("브리핑 — 첫 조회 시 LLM 생성·저장, 재조회는 캐시(LLM 재호출 없음)")
    void briefingGenerateThenCache() throws Exception {
        seedRecentData();
        when(openAiClient.complete(any())).thenReturn(LLM_BRIEFING);

        mockMvc.perform(get("/api/coach/briefing").header("Authorization", bearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hasData").value(true))
                .andExpect(jsonPath("$.source").value("LLM"))
                .andExpect(jsonPath("$.headline").value("오늘도 좋아요"))
                .andExpect(jsonPath("$.recommendations.length()").value(2))
                .andExpect(jsonPath("$.recommendations[0].category").value("meal"))
                .andExpect(jsonPath("$.recommendations[0].title").value("점심 단백질"))
                .andExpect(jsonPath("$.stats.streakDays").value(1));

        // 재조회 — LLM이 죽어도 캐시가 반환되어야 한다
        when(openAiClient.complete(any())).thenThrow(new RuntimeException("openai down"));
        mockMvc.perform(get("/api/coach/briefing").header("Authorization", bearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.source").value("LLM"))
                .andExpect(jsonPath("$.headline").value("오늘도 좋아요"));

        verify(openAiClient, times(1)).complete(any()); // 생성은 1회뿐
    }

    @Test
    @DisplayName("브리핑 — LLM 실패 시 규칙 폴백(source=FALLBACK), 비영속")
    void briefingFallback() throws Exception {
        seedRecentData();
        when(openAiClient.complete(any())).thenThrow(new RuntimeException("openai down"));

        mockMvc.perform(get("/api/coach/briefing").header("Authorization", bearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hasData").value(true))
                .andExpect(jsonPath("$.source").value("FALLBACK"))
                .andExpect(jsonPath("$.headline").isNotEmpty());
    }

    @Test
    @DisplayName("브리핑 — 데이터 부족 시 생성 없이 안내(hasData=false)")
    void briefingInsufficient() throws Exception {
        mockMvc.perform(get("/api/coach/briefing").header("Authorization", bearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.hasData").value(false))
                .andExpect(jsonPath("$.source").value("NONE"));
    }

    @Test
    @DisplayName("채팅 — SSE로 토큰·done 스트리밍, 두 턴 저장·사용량 증가")
    void chatSendAndHistory() throws Exception {
        seedRecentData();
        stubStream("좋은 질문이에요! 오늘은 단백질을 조금 더 챙겨보세요.");

        String body = streamChat("{\"content\":\"점심 뭐 먹을까요?\"}");
        assertThat(body).contains("token").contains("done")
                .contains("좋은 질문이에요! 오늘은 단백질을 조금 더 챙겨보세요.")
                .contains("ASSISTANT");

        mockMvc.perform(get("/api/coach/messages").header("Authorization", bearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].role").value("USER"))
                .andExpect(jsonPath("$[0].content").value("점심 뭐 먹을까요?"))
                .andExpect(jsonPath("$[1].role").value("ASSISTANT"));
        assertThat(chatUsageRepository.count(member.getId(), LocalDate.now(KST))).isEqualTo(1);
    }

    @Test
    @DisplayName("채팅 — 초기화 시 히스토리 전부 삭제")
    void chatClear() throws Exception {
        stubStream("안녕하세요!");
        streamChat("{\"content\":\"안녕\"}");

        mockMvc.perform(delete("/api/coach/messages").header("Authorization", bearer))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/coach/messages").header("Authorization", bearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    @DisplayName("채팅 — LLM 실패는 폴백 안내 + 사용량 미증가")
    void chatFailureNotCounted() throws Exception {
        when(openAiClient.stream(any(), any())).thenThrow(new RuntimeException("openai down"));

        String body = streamChat("{\"content\":\"질문\"}");
        assertThat(body).contains("done").contains("ASSISTANT");

        // 실패 호출은 사용량으로 세지 않는다
        assertThat(chatUsageRepository.count(member.getId(), LocalDate.now(KST))).isZero();
    }

    @Test
    @DisplayName("채팅 — 일일 상한 초과 시 429, 스트림 시작 안 함")
    void chatDailyLimit() throws Exception {
        LocalDate today = LocalDate.now(KST);
        int limit = props.openai().dailyCoachChatLimit();
        for (int i = 0; i < limit; i++) {
            assertThat(chatUsageRepository.tryReserve(member.getId(), today, limit)).isTrue();
        }

        mockMvc.perform(post("/api/coach/messages").header("Authorization", bearer)
                        .contentType("application/json").content("{\"content\":\"질문\"}"))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    @DisplayName("상한 선점 — 검사와 증가가 한 연산이라 상한 초과분은 선점되지 않는다(TOCTOU 방어)")
    void reserveIsAtomicAgainstLimit() {
        LocalDate today = LocalDate.now(KST);
        assertThat(chatUsageRepository.tryReserve(member.getId(), today, 2)).isTrue();
        assertThat(chatUsageRepository.tryReserve(member.getId(), today, 2)).isTrue();
        // 상한에 도달하면 더 이상 선점되지 않고 카운터도 증가하지 않는다
        assertThat(chatUsageRepository.tryReserve(member.getId(), today, 2)).isFalse();
        assertThat(chatUsageRepository.count(member.getId(), today)).isEqualTo(2);
        // 실패 보정 — 되돌리면 다시 선점 가능
        chatUsageRepository.release(member.getId(), today);
        assertThat(chatUsageRepository.count(member.getId(), today)).isEqualTo(1);
        assertThat(chatUsageRepository.tryReserve(member.getId(), today, 2)).isTrue();
    }

    @Test
    @DisplayName("브리핑 — 이미 오늘 브리핑이 있으면(동시 생성 경쟁) 500 없이 저장된 브리핑을 반환")
    void briefingLosesRaceReturnsSaved() throws Exception {
        seedRecentData();
        // 다른 요청이 먼저 저장한 상황을 재현 — 생성 경로가 UNIQUE 위반을 만나도 폴백/500이 아니라 캐시를 쓴다.
        // coach_date는 섭취 기준(ServiceDay)이라 달력 날짜로 저장하면 00~05시에 조회 키가 어긋난다.
        briefingRepository.save(CoachingMessage.of(member.getId(), ServiceDay.today(clock),
                "먼저 저장된 브리핑", "경쟁에서 이긴 쪽 내용", "[]", "{}", "LLM"));

        mockMvc.perform(get("/api/coach/briefing").header("Authorization", bearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.headline").value("먼저 저장된 브리핑"))
                .andExpect(jsonPath("$.source").value("LLM"));
    }

    @Test
    @DisplayName("인증 없는 코칭 요청 — 401")
    void requiresAuth() throws Exception {
        mockMvc.perform(get("/api/coach/briefing")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/coach/messages")).andExpect(status().isUnauthorized());
    }
}
