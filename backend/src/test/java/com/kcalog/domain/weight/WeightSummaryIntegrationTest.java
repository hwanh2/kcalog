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
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** 체중 요약 — 추세선·BMI·연속 기록·목표 예상 (enhance-weight-tab) */
@IntegrationTest
@Transactional
class WeightSummaryIntegrationTest {

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
        member = memberRepository.save(Member.signUp(Provider.KAKAO, "kakao-sum", "sum@kakao.com", "요약"));
        bearer = "Bearer " + jwtService.issueAccessToken(member.getId());
    }

    /** start부터 하루 간격으로 dailyDelta씩 변하는 n일치 체중을 upsert */
    private void insertSeries(String start, int n, double startKg, double dailyDelta) {
        LocalDate s = LocalDate.parse(start);
        for (int i = 0; i < n; i++) {
            weightLogRepository.upsert(member.getId(), s.plusDays(i),
                    BigDecimal.valueOf(Math.round((startKg + dailyDelta * i) * 10) / 10.0));
        }
    }

    @Test
    @DisplayName("추세·BMI·연속 기록·목표 예상을 함께 반환한다")
    void fullSummary() throws Exception {
        member.updateProfile(new BigDecimal("170"), null, null, new BigDecimal("65"), null);
        memberRepository.save(member);
        insertSeries("2026-07-01", 20, 70.0, -0.1); // 70 → 68.1, 목표 65 방향

        mockMvc.perform(get("/api/weights/summary").header("Authorization", bearer)
                        .param("from", "2026-07-01").param("to", "2026-07-20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.points.length()").value(20))
                .andExpect(jsonPath("$.points[0].trendKg").exists())
                .andExpect(jsonPath("$.latestKg").value(68.1))
                .andExpect(jsonPath("$.streakDays").value(20))
                .andExpect(jsonPath("$.bmi.category").value("OVERWEIGHT"))
                .andExpect(jsonPath("$.projection.status").value("ON_TRACK"))
                .andExpect(jsonPath("$.projection.projectedDate").exists());
    }

    @Test
    @DisplayName("신장·목표가 없으면 BMI는 null, 예상은 NO_GOAL")
    void noProfile() throws Exception {
        insertSeries("2026-07-01", 3, 70.0, 0.0);

        mockMvc.perform(get("/api/weights/summary").header("Authorization", bearer)
                        .param("from", "2026-07-01").param("to", "2026-07-03"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bmi").isEmpty())
                .andExpect(jsonPath("$.projection.status").value("NO_GOAL"))
                .andExpect(jsonPath("$.streakDays").value(3));
    }

    @Test
    @DisplayName("기록이 없으면 빈 점 목록·데이터 부족 예상")
    void noLogs() throws Exception {
        member.updateProfile(null, null, null, new BigDecimal("65"), null);
        memberRepository.save(member);

        mockMvc.perform(get("/api/weights/summary").header("Authorization", bearer)
                        .param("from", "2026-07-01").param("to", "2026-07-20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.points.length()").value(0))
                .andExpect(jsonPath("$.latestKg").isEmpty())
                .andExpect(jsonPath("$.streakDays").value(0))
                .andExpect(jsonPath("$.projection.status").value("INSUFFICIENT_DATA"));
    }
}
