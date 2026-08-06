package com.kcalog.domain.meal;

import com.kcalog.IntegrationTest;
import com.kcalog.domain.auth.service.JwtService;
import com.kcalog.domain.meal.repository.MealRepository;
import com.kcalog.domain.member.entity.Member;
import com.kcalog.domain.member.entity.Provider;
import com.kcalog.domain.member.repository.MemberRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@IntegrationTest
@Transactional
class MealIntegrationTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    MemberRepository memberRepository;

    @Autowired
    MealRepository mealRepository;

    @Autowired
    JwtService jwtService;

    Member member;
    String bearer;

    // 2026-08-06 12:30 KST = 03:30Z (KST 기준 2026-08-06에 속함)
    static final String LUNCH = """
            {
              "eatenAt": "2026-08-06T03:30:00Z",
              "mealType": "LUNCH",
              "source": "AI",
              "totalKcal": 650,
              "carbG": 75.0,
              "proteinG": 30.0,
              "fatG": 22.0
            }
            """;

    @BeforeEach
    void setUp() {
        member = memberRepository.save(Member.signUp(Provider.KAKAO, "kakao-meal", "m@kakao.com", "테스터"));
        bearer = "Bearer " + jwtService.issueAccessToken(member.getId());
    }

    private Long saveLunch() throws Exception {
        String body = mockMvc.perform(post("/api/meals").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON).content(LUNCH))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return com.jayway.jsonpath.JsonPath.parse(body).read("$.id", Long.class);
    }

    @Test
    @DisplayName("식사 저장 — AI 확인 결과가 저장되고 응답에 반영된다")
    void save() throws Exception {
        mockMvc.perform(post("/api/meals").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON).content(LUNCH))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.mealType").value("LUNCH"))
                .andExpect(jsonPath("$.source").value("AI"))
                .andExpect(jsonPath("$.totalKcal").value(650));

        assertThat(mealRepository.findAll()).hasSize(1);
    }

    @Test
    @DisplayName("범위 밖 영양값 — 400, 저장되지 않음")
    void saveValidation() throws Exception {
        mockMvc.perform(post("/api/meals").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(LUNCH.replace("\"totalKcal\": 650", "\"totalKcal\": -5")))
                .andExpect(status().isBadRequest());

        assertThat(mealRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("날짜별 조회 — 해당 날짜(KST) 기록만 시각 순으로 반환한다")
    void byDate() throws Exception {
        saveLunch(); // 2026-08-06 KST
        // 전날 저녁(2026-08-05 KST 22:00 = 13:00Z)
        mockMvc.perform(post("/api/meals").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(LUNCH.replace("2026-08-06T03:30:00Z", "2026-08-05T13:00:00Z")))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/meals").header("Authorization", bearer).param("date", "2026-08-06"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].mealType").value("LUNCH"));
    }

    @Test
    @DisplayName("자정 경계 — 다음날 00:00 KST 식사는 오늘 조회에 잡히지 않는다 (반개구간)")
    void midnightBoundary() throws Exception {
        // 2026-08-07 00:00 KST == 2026-08-06T15:00:00Z
        mockMvc.perform(post("/api/meals").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(LUNCH.replace("2026-08-06T03:30:00Z", "2026-08-06T15:00:00Z")))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/meals").header("Authorization", bearer).param("date", "2026-08-06"))
                .andExpect(jsonPath("$.length()").value(0));
        mockMvc.perform(get("/api/meals").header("Authorization", bearer).param("date", "2026-08-07"))
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    @DisplayName("식사 수정 — 보낸 필드만 반영, source는 불변")
    void update() throws Exception {
        Long id = saveLunch();

        mockMvc.perform(patch("/api/meals/" + id).header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"totalKcal\": 700, \"mealType\": \"DINNER\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalKcal").value(700))
                .andExpect(jsonPath("$.mealType").value("DINNER"))
                .andExpect(jsonPath("$.carbG").value(75.0))
                .andExpect(jsonPath("$.source").value("AI"));
    }

    @Test
    @DisplayName("식사 삭제 — 제거된다")
    void deleteMeal() throws Exception {
        Long id = saveLunch();

        mockMvc.perform(delete("/api/meals/" + id).header("Authorization", bearer))
                .andExpect(status().isNoContent());

        assertThat(mealRepository.findById(id)).isEmpty();
    }

    @Test
    @DisplayName("타인 기록 접근 — 조회·수정·삭제 모두 404")
    void isolation() throws Exception {
        Long id = saveLunch();
        Member other = memberRepository.save(Member.signUp(Provider.KAKAO, "kakao-other", "o@kakao.com", "타인"));
        String otherBearer = "Bearer " + jwtService.issueAccessToken(other.getId());

        mockMvc.perform(patch("/api/meals/" + id).header("Authorization", otherBearer)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"totalKcal\": 700}"))
                .andExpect(status().isNotFound());
        mockMvc.perform(delete("/api/meals/" + id).header("Authorization", otherBearer))
                .andExpect(status().isNotFound());

        // 타인의 날짜별 조회에는 잡히지 않는다
        mockMvc.perform(get("/api/meals").header("Authorization", otherBearer).param("date", "2026-08-06"))
                .andExpect(jsonPath("$.length()").value(0));
        // 원 소유자 것은 그대로
        assertThat(mealRepository.findById(id)).isPresent();
    }

    @Test
    @DisplayName("인증 없는 요청 — 401")
    void requiresAuth() throws Exception {
        mockMvc.perform(get("/api/meals").param("date", "2026-08-06"))
                .andExpect(status().isUnauthorized());
    }
}
