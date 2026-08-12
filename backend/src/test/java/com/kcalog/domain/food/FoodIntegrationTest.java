package com.kcalog.domain.food;

import com.kcalog.IntegrationTest;
import com.kcalog.domain.auth.service.JwtService;
import com.kcalog.domain.correction.repository.FoodCorrectionRepository;
import com.kcalog.domain.food.repository.MemberFavoriteFoodRepository;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** 음식 카탈로그·즐겨찾기 — 목록 통합·저장/덮어쓰기·삭제·개인 보정치 연동 */
@IntegrationTest
@Transactional
class FoodIntegrationTest {

    @Autowired
    MockMvc mockMvc;
    @Autowired
    MemberRepository memberRepository;
    @Autowired
    MemberFavoriteFoodRepository favoriteRepository;
    @Autowired
    FoodCorrectionRepository correctionRepository;
    @Autowired
    JwtService jwtService;

    Member member;
    String bearer;

    static final String EGG_FAVORITE = """
            {
              "name": "삶은달걀", "emoji": "🥚", "quantity": 2, "unit": "개",
              "kcal": 140, "carbG": 0.8, "proteinG": 12.6, "fatG": 9.6
            }
            """;

    @BeforeEach
    void setUp() {
        member = memberRepository.save(Member.signUp(Provider.KAKAO, "kakao-food", "food@kakao.com", "푸드"));
        bearer = "Bearer " + jwtService.issueAccessToken(member.getId());
    }

    @Test
    @DisplayName("카탈로그 조회 — 시드 30개가 정렬 순으로 내려온다")
    void catalog() throws Exception {
        mockMvc.perform(get("/api/foods").header("Authorization", bearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(30))
                .andExpect(jsonPath("$[0].name").value("삶은달걀"))
                .andExpect(jsonPath("$[0].source").value("CATALOG"))
                .andExpect(jsonPath("$[0].emoji").value("🥚"))
                .andExpect(jsonPath("$[0].unit").value("개"))
                .andExpect(jsonPath("$[0].aliases", org.hamcrest.Matchers.hasItem("계란")));
    }

    @Test
    @DisplayName("인증 없이 조회하면 401")
    void requiresAuth() throws Exception {
        mockMvc.perform(get("/api/foods"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("즐겨찾기 저장 — 목록 맨 앞에 즐겨찾기가 오고 출처가 구분된다")
    void saveFavorite() throws Exception {
        mockMvc.perform(post("/api/favorites").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON).content(EGG_FAVORITE))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.source").value("FAVORITE"))
                .andExpect(jsonPath("$.kcal").value(140));

        mockMvc.perform(get("/api/foods").header("Authorization", bearer))
                .andExpect(jsonPath("$.length()").value(31))
                .andExpect(jsonPath("$[0].source").value("FAVORITE"))
                .andExpect(jsonPath("$[0].name").value("삶은달걀"));
    }

    @Test
    @DisplayName("같은 음식 재저장 — 중복 생성 없이 최신값으로 덮어쓴다(띄어쓰기 차이 흡수)")
    void overwritesOnResave() throws Exception {
        mockMvc.perform(post("/api/favorites").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON).content(EGG_FAVORITE))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/favorites").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(EGG_FAVORITE.replace("\"삶은달걀\"", "\"삶은 달걀\"").replace("140", "150")))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/favorites").header("Authorization", bearer))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].kcal").value(150))
                .andExpect(jsonPath("$[0].name").value("삶은 달걀"));
    }

    @Test
    @DisplayName("기본 저장은 개인 보정치를 건드리지 않는다")
    void doesNotTouchCorrectionByDefault() throws Exception {
        mockMvc.perform(post("/api/favorites").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON).content(EGG_FAVORITE))
                .andExpect(status().isOk());

        assertThat(correctionRepository.findByMemberIdAndFoodNameNormalized(member.getId(), "삶은달걀")).isEmpty();
    }

    @Test
    @DisplayName("AI 분석에도 반영 — 보정치는 1단위 기준값으로 환산해 저장된다")
    void remembersAsCorrectionPerUnit() throws Exception {
        mockMvc.perform(post("/api/favorites").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(EGG_FAVORITE.replace("\"fatG\": 9.6", "\"fatG\": 9.6, \"rememberForAnalysis\": true")))
                .andExpect(status().isOk());

        // 2개 140kcal로 저장했으므로 보정치는 1개 기준 70kcal
        assertThat(correctionRepository.findByMemberIdAndFoodNameNormalized(member.getId(), "삶은달걀"))
                .hasValueSatisfying(c -> {
                    assertThat(c.getKcal()).isEqualTo(70);
                    assertThat(c.getProteinG()).isEqualByComparingTo("6.3");
                });
    }

    @Test
    @DisplayName("즐겨찾기 삭제 — 목록에서 사라진다")
    void deleteFavorite() throws Exception {
        String body = mockMvc.perform(post("/api/favorites").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON).content(EGG_FAVORITE))
                .andReturn().getResponse().getContentAsString();
        Long id = com.jayway.jsonpath.JsonPath.parse(body).read("$.id", Long.class);

        mockMvc.perform(delete("/api/favorites/" + id).header("Authorization", bearer))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/favorites").header("Authorization", bearer))
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    @DisplayName("타인의 즐겨찾기는 삭제할 수 없다 — 404")
    void cannotDeleteOthers() throws Exception {
        Member other = memberRepository.save(Member.signUp(Provider.KAKAO, "kakao-other", "o@kakao.com", "타인"));
        String otherBearer = "Bearer " + jwtService.issueAccessToken(other.getId());
        String body = mockMvc.perform(post("/api/favorites").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON).content(EGG_FAVORITE))
                .andReturn().getResponse().getContentAsString();
        Long id = com.jayway.jsonpath.JsonPath.parse(body).read("$.id", Long.class);

        mockMvc.perform(delete("/api/favorites/" + id).header("Authorization", otherBearer))
                .andExpect(status().isNotFound());

        assertThat(favoriteRepository.findById(id)).isPresent();
    }

    @Test
    @DisplayName("수량이 0이면 400")
    void rejectsZeroQuantity() throws Exception {
        mockMvc.perform(post("/api/favorites").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(EGG_FAVORITE.replace("\"quantity\": 2", "\"quantity\": 0")))
                .andExpect(status().isBadRequest());
    }
}
