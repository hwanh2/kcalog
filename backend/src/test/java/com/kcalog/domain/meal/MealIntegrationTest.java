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

    // 김치찌개 400 + 공기밥 250 → 합계 kcal 650, 탄 85, 단 25, 지 19
    static final String LUNCH = """
            {
              "eatenAt": "2026-08-06T03:30:00Z",
              "mealType": "LUNCH",
              "source": "AI",
              "items": [
                {"name": "김치찌개", "kcal": 400, "carbG": 30.0, "proteinG": 20.0, "fatG": 18.0},
                {"name": "공기밥", "kcal": 250, "carbG": 55.0, "proteinG": 5.0, "fatG": 1.0}
              ]
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
    @DisplayName("식사 저장 — 항목 저장 + 합계는 항목 합으로 계산된다")
    void save() throws Exception {
        mockMvc.perform(post("/api/meals").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON).content(LUNCH))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").exists())
                .andExpect(jsonPath("$.mealType").value("LUNCH"))
                .andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.items[0].name").value("김치찌개"))
                .andExpect(jsonPath("$.totalKcal").value(650))
                .andExpect(jsonPath("$.carbG").value(85.0))
                .andExpect(jsonPath("$.proteinG").value(25.0))
                .andExpect(jsonPath("$.fatG").value(19.0));

        assertThat(mealRepository.findAll()).hasSize(1);
    }

    @Test
    @DisplayName("빈 항목 — 400 (최소 1개 필요)")
    void emptyItems() throws Exception {
        mockMvc.perform(post("/api/meals").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(LUNCH.replaceAll("(?s)\"items\":.*\\]", "\"items\": []")))
                .andExpect(status().isBadRequest());
        assertThat(mealRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("범위 밖 항목 영양값 — 400, 저장되지 않음")
    void itemValidation() throws Exception {
        mockMvc.perform(post("/api/meals").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(LUNCH.replace("\"kcal\": 400", "\"kcal\": -5")))
                .andExpect(status().isBadRequest());
        assertThat(mealRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("날짜별 조회 — 해당 날짜(KST) 기록만 항목과 함께 반환한다")
    void byDate() throws Exception {
        saveLunch(); // 2026-08-06 KST
        mockMvc.perform(post("/api/meals").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(LUNCH.replace("2026-08-06T03:30:00Z", "2026-08-05T13:00:00Z")))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/meals").header("Authorization", bearer).param("date", "2026-08-06"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].items.length()").value(2));
    }

    @Test
    @DisplayName("자정 경계 — 다음날 00:00 KST 식사는 오늘 조회에 잡히지 않는다")
    void midnightBoundary() throws Exception {
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
    @DisplayName("항목 수정 — items 교체 시 기존 항목이 사라지고 합계가 재계산된다")
    void updateReplacesItems() throws Exception {
        Long id = saveLunch();

        mockMvc.perform(patch("/api/meals/" + id).header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"mealType": "DINNER",
                                 "items": [{"name": "샐러드", "kcal": 200, "carbG": 15.0, "proteinG": 8.0, "fatG": 12.0}]}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mealType").value("DINNER"))
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].name").value("샐러드"))
                .andExpect(jsonPath("$.totalKcal").value(200))
                .andExpect(jsonPath("$.carbG").value(15.0));

        // 교체된 항목만 남는다 (김치찌개·공기밥 제거)
        mockMvc.perform(get("/api/meals").header("Authorization", bearer).param("date", "2026-08-06"))
                .andExpect(jsonPath("$[0].items.length()").value(1));
    }

    @Test
    @DisplayName("항목 없는 부분 수정 — 끼니만 바꾸고 항목·합계는 유지된다")
    void updateMetaOnly() throws Exception {
        Long id = saveLunch();

        mockMvc.perform(patch("/api/meals/" + id).header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"mealType\": \"SNACK\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mealType").value("SNACK"))
                .andExpect(jsonPath("$.items.length()").value(2))
                .andExpect(jsonPath("$.totalKcal").value(650));
    }

    @Test
    @DisplayName("식사 삭제 — 항목도 함께 제거된다")
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
                        .contentType(MediaType.APPLICATION_JSON).content("{\"mealType\": \"DINNER\"}"))
                .andExpect(status().isNotFound());
        mockMvc.perform(delete("/api/meals/" + id).header("Authorization", otherBearer))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/meals").header("Authorization", otherBearer).param("date", "2026-08-06"))
                .andExpect(jsonPath("$.length()").value(0));
        assertThat(mealRepository.findById(id)).isPresent();
    }

    @Test
    @DisplayName("인증 없는 요청 — 401")
    void requiresAuth() throws Exception {
        mockMvc.perform(get("/api/meals").param("date", "2026-08-06"))
                .andExpect(status().isUnauthorized());
    }
}
