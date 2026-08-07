package com.kcalog.domain.meal;

import com.kcalog.IntegrationTest;
import com.kcalog.domain.auth.service.JwtService;
import com.kcalog.domain.meal.service.OpenAiClient;
import com.kcalog.domain.member.entity.Member;
import com.kcalog.domain.member.entity.Provider;
import com.kcalog.domain.member.repository.MemberRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** analyze 엔드포인트 배선(멀티파트 업로드) + 예외→상태코드 매핑 검증. OpenAI HTTP는 목킹 */
@IntegrationTest
@Transactional
class MealAnalyzeIntegrationTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    MemberRepository memberRepository;

    @Autowired
    JwtService jwtService;

    @MockitoBean
    OpenAiClient openAiClient;

    Member member;
    String bearer;

    @BeforeEach
    void setUp() {
        member = memberRepository.save(Member.signUp(Provider.KAKAO, "kakao-analyze", "a@kakao.com", "테스터"));
        bearer = "Bearer " + jwtService.issueAccessToken(member.getId());
    }

    private MockMultipartFile image() {
        return new MockMultipartFile("image", "food.jpg", "image/jpeg", "fake-bytes".getBytes());
    }

    @Test
    @DisplayName("사진 분석 — 멀티파트 업로드 → 분석 결과 반환, 저장 없음")
    void analyze() throws Exception {
        when(openAiClient.complete(any())).thenReturn("""
                {"foodFound":true,"totalKcal":650,"carbG":75.0,"proteinG":30.0,"fatG":22.0,"confidence":0.8,"notes":""}
                """);

        mockMvc.perform(multipart("/api/meals/analyze").file(image()).header("Authorization", bearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.foodFound").value(true))
                .andExpect(jsonPath("$.totalKcal").value(650))
                .andExpect(jsonPath("$.proteinG").value(30.0));
    }

    @Test
    @DisplayName("분석 실패(재시도 후) — 502로 매핑되어 프론트가 수동 입력으로 폴백")
    void analysisFailureMapsTo502() throws Exception {
        when(openAiClient.complete(any())).thenThrow(new RuntimeException("openai down"));

        mockMvc.perform(multipart("/api/meals/analyze").file(image()).header("Authorization", bearer))
                .andExpect(status().isBadGateway());
    }

    @Test
    @DisplayName("일일 상한 초과 — 21번째 호출은 429")
    void dailyLimit() throws Exception {
        when(openAiClient.complete(any())).thenReturn("""
                {"foodFound":true,"totalKcal":100,"carbG":1,"proteinG":1,"fatG":1,"confidence":0.5,"notes":""}
                """);

        for (int i = 0; i < 20; i++) {
            mockMvc.perform(multipart("/api/meals/analyze").file(image()).header("Authorization", bearer))
                    .andExpect(status().isOk());
        }
        mockMvc.perform(multipart("/api/meals/analyze").file(image()).header("Authorization", bearer))
                .andExpect(status().isTooManyRequests());
    }

    @Test
    @DisplayName("인증 없는 분석 요청 — 401")
    void requiresAuth() throws Exception {
        mockMvc.perform(multipart("/api/meals/analyze").file(image()))
                .andExpect(status().isUnauthorized());
    }
}
