package com.kcalog.domain.food;

import com.kcalog.IntegrationTest;
import com.kcalog.domain.auth.service.JwtService;
import com.kcalog.domain.food.repository.MemberFavoriteFoodRepository;
import com.kcalog.domain.food.repository.MemberFavoriteMealRepository;
import com.kcalog.domain.food.service.FavoriteMealService;
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

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** 끼니 세트 — 저장·덮어쓰기·조회·삭제·상한, 그리고 집계에 섞이지 않는다는 것 */
@IntegrationTest
@Transactional
class FavoriteMealIntegrationTest {

    @Autowired
    MockMvc mockMvc;
    @Autowired
    MemberRepository memberRepository;
    @Autowired
    MemberFavoriteMealRepository favoriteMealRepository;
    @Autowired
    MemberFavoriteFoodRepository favoriteFoodRepository;
    @Autowired
    JwtService jwtService;

    Member member;
    String bearer;

    static final String LUNCH_SET = """
            {
              "name": "회사 점심 A",
              "items": [
                {"name": "잡곡밥", "quantity": 1, "unit": "공기", "kcal": 300, "carbG": 70, "proteinG": 7, "fatG": 2},
                {"name": "미역국", "quantity": 1, "unit": "그릇", "kcal": 120, "carbG": 6, "proteinG": 16, "fatG": 10}
              ]
            }
            """;

    @BeforeEach
    void setUp() {
        member = memberRepository.save(Member.signUp(Provider.KAKAO, "kakao-set", "set@kakao.com", "세트"));
        bearer = "Bearer " + jwtService.issueAccessToken(member.getId());
    }

    private void saveSet(String body) throws Exception {
        mockMvc.perform(post("/api/favorite-meals").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("세트 저장 — 항목과 합계가 함께 내려온다")
    void save() throws Exception {
        mockMvc.perform(post("/api/favorite-meals").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON).content(LUNCH_SET))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("회사 점심 A"))
                .andExpect(jsonPath("$.itemCount").value(2))
                .andExpect(jsonPath("$.totalKcal").value(420))
                .andExpect(jsonPath("$.carbG").value(76.0))
                .andExpect(jsonPath("$.proteinG").value(23.0))
                .andExpect(jsonPath("$.fatG").value(12.0))
                .andExpect(jsonPath("$.items[0].name").value("잡곡밥"))
                .andExpect(jsonPath("$.items[1].name").value("미역국"));
    }

    @Test
    @DisplayName("세트를 저장해도 개별 즐겨찾기는 늘지 않는다 — 한 번 저장에 음식 목록이 불어나면 찾기가 더 어렵다")
    void doesNotCreateFavoriteFoods() throws Exception {
        saveSet(LUNCH_SET);

        assertThat(favoriteFoodRepository.findByMemberIdOrderByUpdatedAtDesc(member.getId())).isEmpty();
    }

    @Test
    @DisplayName("같은 이름으로 다시 저장하면 세트가 늘지 않고 구성이 바뀐다")
    void overwrite() throws Exception {
        saveSet(LUNCH_SET);
        saveSet("""
                {
                  "name": "회사 점심 A",
                  "items": [
                    {"name": "샐러드", "quantity": 1, "unit": "접시", "kcal": 100, "carbG": 8, "proteinG": 5, "fatG": 7}
                  ]
                }
                """);

        assertThat(favoriteMealRepository.countByMemberId(member.getId())).isEqualTo(1);
        mockMvc.perform(get("/api/favorite-meals").header("Authorization", bearer))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].itemCount").value(1))
                .andExpect(jsonPath("$[0].items[0].name").value("샐러드"));
    }

    @Test
    @DisplayName("띄어쓰기만 다른 이름도 같은 세트로 본다 — 즐겨찾기 음식과 같은 정규화 규칙")
    void overwriteAbsorbsSpacing() throws Exception {
        saveSet(LUNCH_SET);
        saveSet("""
                {
                  "name": "회사점심A",
                  "items": [
                    {"name": "샐러드", "quantity": 1, "unit": "접시", "kcal": 100, "carbG": 8, "proteinG": 5, "fatG": 7}
                  ]
                }
                """);

        assertThat(favoriteMealRepository.countByMemberId(member.getId())).isEqualTo(1);
        // 표시 이름은 최신 표기로 갱신된다
        mockMvc.perform(get("/api/favorite-meals").header("Authorization", bearer))
                .andExpect(jsonPath("$[0].name").value("회사점심A"));
    }

    @Test
    @DisplayName("삭제 — 세트와 항목이 함께 사라진다")
    void deleteSet() throws Exception {
        saveSet(LUNCH_SET);
        Long id = favoriteMealRepository.findByMemberIdOrderByUpdatedAtDesc(member.getId()).getFirst().getId();

        mockMvc.perform(delete("/api/favorite-meals/" + id).header("Authorization", bearer))
                .andExpect(status().isNoContent());

        assertThat(favoriteMealRepository.countByMemberId(member.getId())).isZero();
    }

    @Test
    @DisplayName("다른 회원의 세트는 지울 수 없다")
    void cannotDeleteOthers() throws Exception {
        saveSet(LUNCH_SET);
        Long id = favoriteMealRepository.findByMemberIdOrderByUpdatedAtDesc(member.getId()).getFirst().getId();

        Member other = memberRepository.save(Member.signUp(Provider.KAKAO, "kakao-other", "other@kakao.com", "남"));
        String otherBearer = "Bearer " + jwtService.issueAccessToken(other.getId());

        mockMvc.perform(delete("/api/favorite-meals/" + id).header("Authorization", otherBearer))
                .andExpect(status().isNotFound());

        assertThat(favoriteMealRepository.countByMemberId(member.getId())).isEqualTo(1);
    }

    @Test
    @DisplayName("남의 세트는 목록에도 안 나온다")
    void listIsPerMember() throws Exception {
        saveSet(LUNCH_SET);

        Member other = memberRepository.save(Member.signUp(Provider.KAKAO, "kakao-other2", "other2@kakao.com", "남2"));
        String otherBearer = "Bearer " + jwtService.issueAccessToken(other.getId());

        mockMvc.perform(get("/api/favorite-meals").header("Authorization", otherBearer))
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    @DisplayName("항목이 없으면 저장하지 않는다")
    void rejectsEmptyItems() throws Exception {
        mockMvc.perform(post("/api/favorite-meals").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name": "빈 세트", "items": []}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("한 끼 기록과 같은 항목 개수 상한을 넘으면 거부한다 — 상한이 다르면 담을 수 없는 세트가 생긴다")
    void rejectsTooManyItems() throws Exception {
        StringBuilder items = new StringBuilder();
        for (int i = 0; i < 31; i++) { // MealValidation.MAX_ITEMS = 30
            if (i > 0) items.append(",");
            items.append("""
                    {"name": "음식%d", "quantity": 1, "unit": "개", "kcal": 10, "carbG": 1, "proteinG": 1, "fatG": 1}
                    """.formatted(i));
        }

        mockMvc.perform(post("/api/favorite-meals").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\": \"너무 많음\", \"items\": [%s]}".formatted(items)))
                .andExpect(status().isBadRequest());

        assertThat(favoriteMealRepository.countByMemberId(member.getId())).isZero();
    }

    @Test
    @DisplayName("회원당 세트 상한을 넘으면 거부한다 — 목록을 전량 내려주므로 무한히 쌓이면 못 쓴다")
    void rejectsTooManySets() throws Exception {
        for (int i = 0; i < FavoriteMealService.MAX_SETS_PER_MEMBER; i++) {
            saveSet(LUNCH_SET.replace("회사 점심 A", "세트" + i));
        }

        mockMvc.perform(post("/api/favorite-meals").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(LUNCH_SET.replace("회사 점심 A", "하나 더")))
                .andExpect(status().isBadRequest());

        assertThat(favoriteMealRepository.countByMemberId(member.getId()))
                .isEqualTo(FavoriteMealService.MAX_SETS_PER_MEMBER);
    }

    @Test
    @DisplayName("상한에 닿아도 기존 세트 덮어쓰기는 막지 않는다 — 개수가 늘지 않는다")
    void overwriteAllowedAtLimit() throws Exception {
        for (int i = 0; i < FavoriteMealService.MAX_SETS_PER_MEMBER; i++) {
            saveSet(LUNCH_SET.replace("회사 점심 A", "세트" + i));
        }

        saveSet(LUNCH_SET.replace("회사 점심 A", "세트0")); // 이미 있는 이름 — 통과해야 한다

        assertThat(favoriteMealRepository.countByMemberId(member.getId()))
                .isEqualTo(FavoriteMealService.MAX_SETS_PER_MEMBER);
    }

    @Test
    @DisplayName("세트를 저장하기만 하면 그날 섭취 집계는 그대로다 — 세트는 먹은 사실이 아니라 틀이다")
    void doesNotAffectDashboard() throws Exception {
        String today = LocalDate.now().toString();
        saveSet(LUNCH_SET);

        mockMvc.perform(get("/api/dashboard").param("date", today).header("Authorization", bearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalKcal").value(0));
    }
}
