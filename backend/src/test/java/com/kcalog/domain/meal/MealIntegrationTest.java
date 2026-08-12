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
    @DisplayName("PATCH 빈 items — 400 (모든 항목 삭제 방지)")
    void updateEmptyItemsRejected() throws Exception {
        Long id = saveLunch();
        mockMvc.perform(patch("/api/meals/" + id).header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"items\": []}"))
                .andExpect(status().isBadRequest());
        // 기존 항목 유지
        mockMvc.perform(get("/api/meals").header("Authorization", bearer).param("date", "2026-08-06"))
                .andExpect(jsonPath("$[0].items.length()").value(2));
    }

    @Test
    @DisplayName("항목 개수 상한 초과 — 400 (자원 소진 방지)")
    void tooManyItemsRejected() throws Exception {
        String item = "{\"name\": \"밥\", \"kcal\": 100, \"carbG\": 20.0, \"proteinG\": 2.0, \"fatG\": 1.0}";
        String items = java.util.Collections.nCopies(31, item).stream().collect(java.util.stream.Collectors.joining(","));
        String body = "{\"eatenAt\": \"2026-08-06T03:30:00Z\", \"mealType\": \"LUNCH\", \"source\": \"MANUAL\", \"items\": [" + items + "]}";
        mockMvc.perform(post("/api/meals").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest());
        assertThat(mealRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("항목 이름 길이 초과 — 400 (컬럼 VARCHAR(100))")
    void itemNameTooLong() throws Exception {
        String longName = "가".repeat(101);
        mockMvc.perform(post("/api/meals").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(LUNCH.replace("\"김치찌개\"", "\"" + longName + "\"")))
                .andExpect(status().isBadRequest());
        assertThat(mealRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("합계가 옛 컬럼 한계(9999.9)를 넘는 유효 식사 — 저장 성공 (합계 컬럼 확장 검증)")
    void largeTotalWithinWidenedColumn() throws Exception {
        // 항목 2000 × 6 = 12000 > 9999.9(옛 NUMERIC(5,1)) 이지만 < 99999.9(NUMERIC(6,1))
        String item = "{\"name\": \"밥\", \"kcal\": 1000, \"carbG\": 2000.0, \"proteinG\": 100.0, \"fatG\": 50.0}";
        String items = java.util.Collections.nCopies(6, item).stream().collect(java.util.stream.Collectors.joining(","));
        String body = "{\"eatenAt\": \"2026-08-06T03:30:00Z\", \"mealType\": \"LUNCH\", \"source\": \"MANUAL\", \"items\": [" + items + "]}";
        mockMvc.perform(post("/api/meals").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.carbG").value(12000.0))
                .andExpect(jsonPath("$.totalKcal").value(6000));
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
    @DisplayName("섭취량 저장 — 수량·단위가 함께 남고, 없는 항목도 허용된다")
    void saveWithQuantity() throws Exception {
        String body = """
                {
                  "eatenAt": "2026-08-06T03:30:00Z",
                  "mealType": "BREAKFAST",
                  "source": "MANUAL",
                  "items": [
                    {"name": "삶은달걀", "kcal": 140, "carbG": 0.8, "proteinG": 12.6, "fatG": 9.6,
                     "quantity": 2, "unit": "개"},
                    {"name": "아메리카노", "kcal": 10, "carbG": 1.5, "proteinG": 0.3, "fatG": 0.0}
                  ]
                }
                """;

        mockMvc.perform(post("/api/meals").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalKcal").value(150))
                .andExpect(jsonPath("$.items[0].quantity").value(2))
                .andExpect(jsonPath("$.items[0].unit").value("개"))
                .andExpect(jsonPath("$.items[1].quantity").doesNotExist())
                .andExpect(jsonPath("$.items[1].unit").doesNotExist());

        mockMvc.perform(get("/api/meals").header("Authorization", bearer).param("date", "2026-08-06"))
                .andExpect(jsonPath("$[0].items[0].quantity").value(2))
                .andExpect(jsonPath("$[0].items[0].unit").value("개"));
    }

    @Test
    @DisplayName("수량이 0 이하면 400 — 먹지 않은 항목은 기록하지 않는다")
    void rejectsNonPositiveQuantity() throws Exception {
        String body = LUNCH.replace("\"fatG\": 18.0", "\"fatG\": 18.0, \"quantity\": 0, \"unit\": \"개\"");

        mockMvc.perform(post("/api/meals").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("야식 저장 — 다섯 번째 끼니로 저장·조회된다")
    void saveLateNight() throws Exception {
        String body = LUNCH.replace("\"mealType\": \"LUNCH\"", "\"mealType\": \"LATE_NIGHT\"")
                .replace("2026-08-06T03:30:00Z", "2026-08-06T16:00:00Z"); // 2026-08-07 01:00 KST

        mockMvc.perform(post("/api/meals").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.mealType").value("LATE_NIGHT"));

        // 새벽 1시 야식이므로 전날(8/6)의 기록이다
        mockMvc.perform(get("/api/meals").header("Authorization", bearer).param("date", "2026-08-06"))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].mealType").value("LATE_NIGHT"));
    }

    @Test
    @DisplayName("같은 끼니에 여러 건 — 담을 때마다 기록이 하나씩 늘어난다")
    void multipleMealsPerType() throws Exception {
        saveLunch();
        saveLunch();

        mockMvc.perform(get("/api/meals").header("Authorization", bearer).param("date", "2026-08-06"))
                .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    @DisplayName("하루 경계 — 다음날 새벽 식사는 전날에, 05:00부터 새 날에 잡힌다")
    void dayBoundary() throws Exception {
        // 2026-08-06T19:59Z = 2026-08-07 04:59 KST → 아직 8/6의 기록(야식)
        mockMvc.perform(post("/api/meals").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(LUNCH.replace("2026-08-06T03:30:00Z", "2026-08-06T19:59:00Z")))
                .andExpect(status().isOk());
        // 2026-08-06T20:00Z = 2026-08-07 05:00 KST → 8/7의 기록
        mockMvc.perform(post("/api/meals").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(LUNCH.replace("2026-08-06T03:30:00Z", "2026-08-06T20:00:00Z")))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/meals").header("Authorization", bearer).param("date", "2026-08-06"))
                .andExpect(jsonPath("$.length()").value(1));
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
