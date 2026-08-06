package com.kcalog.domain.weight;

import com.kcalog.IntegrationTest;
import com.kcalog.domain.auth.service.JwtService;
import com.kcalog.domain.member.entity.Member;
import com.kcalog.domain.member.entity.Provider;
import com.kcalog.domain.member.repository.MemberRepository;
import com.kcalog.domain.weight.repository.WeightLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@IntegrationTest
@Transactional
class WeightIntegrationTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    MemberRepository memberRepository;

    @Autowired
    WeightLogRepository weightLogRepository;

    @Autowired
    JwtService jwtService;

    Member member;
    String bearer;

    @BeforeEach
    void setUp() {
        member = memberRepository.save(Member.signUp(Provider.KAKAO, "kakao-weight", "w@kakao.com", "테스터"));
        bearer = "Bearer " + jwtService.issueAccessToken(member.getId());
    }

    @Test
    @DisplayName("체중 기록 — 날짜 없이 제출하면 오늘 날짜로 저장된다")
    void recordToday() throws Exception {
        mockMvc.perform(post("/api/weights").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"weightKg\": 70.5}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.weightKg").value(70.5))
                .andExpect(jsonPath("$.logDate").exists());

        assertThat(weightLogRepository.findTopByMemberIdOrderByLogDateDesc(member.getId()))
                .hasValueSatisfying(log -> assertThat(log.getWeightKg()).isEqualByComparingTo("70.5"));
    }

    @Test
    @DisplayName("체중 기록 — 지정한 날짜로 저장된다")
    void recordGivenDate() throws Exception {
        mockMvc.perform(post("/api/weights").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"weightKg\": 68, \"logDate\": \"2026-08-01\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.logDate").value("2026-08-01"));
    }

    @Test
    @DisplayName("같은 날 재기록 — upsert로 1행만 유지되고 마지막 값이 남는다")
    void upsertSameDay() throws Exception {
        String day = "{\"weightKg\": %s, \"logDate\": \"2026-08-02\"}";
        mockMvc.perform(post("/api/weights").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON).content(day.formatted("70")))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/weights").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON).content(day.formatted("69.2")))
                .andExpect(status().isOk());

        assertThat(weightLogRepository.findByMemberIdAndLogDateBetweenOrderByLogDateAsc(
                member.getId(), LocalDate.parse("2026-08-02"), LocalDate.parse("2026-08-02")))
                .singleElement()
                .satisfies(log -> assertThat(log.getWeightKg()).isEqualByComparingTo("69.2"));
    }

    @Test
    @DisplayName("범위 밖 체중 — 400, 저장되지 않음")
    void rangeValidation() throws Exception {
        mockMvc.perform(post("/api/weights").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"weightKg\": 20}"))
                .andExpect(status().isBadRequest());

        assertThat(weightLogRepository.findTopByMemberIdOrderByLogDateDesc(member.getId())).isEmpty();
    }

    @Test
    @DisplayName("기간 조회 — 범위 내 기록만 날짜 오름차순으로 반환한다")
    void history() throws Exception {
        weightLogRepository.upsert(member.getId(), LocalDate.parse("2026-07-30"), new java.math.BigDecimal("71"));
        weightLogRepository.upsert(member.getId(), LocalDate.parse("2026-08-01"), new java.math.BigDecimal("70"));
        weightLogRepository.upsert(member.getId(), LocalDate.parse("2026-08-05"), new java.math.BigDecimal("69"));

        mockMvc.perform(get("/api/weights").header("Authorization", bearer)
                        .param("from", "2026-07-31").param("to", "2026-08-05"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].logDate").value("2026-08-01"))
                .andExpect(jsonPath("$[1].logDate").value("2026-08-05"));
    }

    @Test
    @DisplayName("다른 회원의 체중은 조회되지 않는다")
    void isolation() throws Exception {
        Member other = memberRepository.save(Member.signUp(Provider.KAKAO, "kakao-other", "o@kakao.com", "타인"));
        weightLogRepository.upsert(other.getId(), LocalDate.parse("2026-08-01"), new java.math.BigDecimal("80"));

        mockMvc.perform(get("/api/weights").header("Authorization", bearer)
                        .param("from", "2026-08-01").param("to", "2026-08-01"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }
}
