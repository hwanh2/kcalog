package com.kcalog.domain.meal;

import com.kcalog.IntegrationTest;
import com.kcalog.domain.analysis.entity.AnalysisJob;
import com.kcalog.domain.analysis.repository.AnalysisJobRepository;
import com.kcalog.domain.auth.service.JwtService;
import com.kcalog.domain.member.entity.Member;
import com.kcalog.domain.member.entity.Provider;
import com.kcalog.domain.member.repository.MemberRepository;
import com.kcalog.global.storage.StorageService;
import com.kcalog.support.InMemoryStorageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** 분석 저장 시 사진 연결 — 저장·조회·삭제·타인 작업 참조 차단. 스토리지는 인메모리 fake */
@IntegrationTest
@Transactional
class MealImageIntegrationTest {

    @Autowired
    MockMvc mockMvc;
    @Autowired
    MemberRepository memberRepository;
    @Autowired
    AnalysisJobRepository jobRepository;
    @Autowired
    JwtService jwtService;
    @Autowired
    StorageService storageService;

    Member member;
    String bearer;

    @BeforeEach
    void setUp() {
        member = memberRepository.save(Member.signUp(Provider.KAKAO, "kakao-mi", "mi@kakao.com", "사진"));
        bearer = "Bearer " + jwtService.issueAccessToken(member.getId());
    }

    private String saveBody(Long jobId) {
        String job = jobId != null ? "\"analysisJobId\": " + jobId + "," : "";
        return """
                {
                  "eatenAt": "2026-08-06T03:30:00Z",
                  "mealType": "LUNCH",
                  "source": "AI",
                  %s
                  "items": [{"name": "김치찌개", "kcal": 400, "carbG": 30.0, "proteinG": 20.0, "fatG": 18.0}]
                }
                """.formatted(job);
    }

    private AnalysisJob storedJob() {
        String key = storageService.put(member.getId(), "jpeg".getBytes(), "image/jpeg");
        return jobRepository.save(AnalysisJob.analyzing(member.getId(), key));
    }

    @Test
    @DisplayName("AI 저장 — 분석 작업의 사진이 식사에 연결되고 작업 행은 삭제된다")
    void savesWithImage() throws Exception {
        AnalysisJob job = storedJob();

        mockMvc.perform(post("/api/meals").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON).content(saveBody(job.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.imageUrl").value(startsWith("/api/photos/" + member.getId() + "/")));

        // 작업 행은 소비되어 삭제, 사진은 남아 meal이 소유
        assertThat(jobRepository.findById(job.getId())).isEmpty();
        assertThat(((InMemoryStorageService) storageService).has(job.getImageKey())).isTrue();
    }

    @Test
    @DisplayName("날짜 조회 응답에 사진 URL 포함")
    void listIncludesImageUrl() throws Exception {
        AnalysisJob job = storedJob();
        mockMvc.perform(post("/api/meals").header("Authorization", bearer)
                .contentType(MediaType.APPLICATION_JSON).content(saveBody(job.getId()))).andExpect(status().isOk());

        mockMvc.perform(get("/api/meals").param("date", "2026-08-06").header("Authorization", bearer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].imageUrl").value(startsWith("/api/photos/")));
    }

    @Test
    @DisplayName("식사 삭제 시 연결된 사진도 제거")
    void deleteRemovesPhoto() throws Exception {
        AnalysisJob job = storedJob();
        String imageKey = job.getImageKey();
        String body = mockMvc.perform(post("/api/meals").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON).content(saveBody(job.getId())))
                .andReturn().getResponse().getContentAsString();
        Long mealId = com.jayway.jsonpath.JsonPath.parse(body).read("$.id", Long.class);

        mockMvc.perform(delete("/api/meals/" + mealId).header("Authorization", bearer))
                .andExpect(status().isNoContent());

        assertThat(((InMemoryStorageService) storageService).has(imageKey)).isFalse();
    }

    @Test
    @DisplayName("수동 입력(analysisJobId 없음) — 사진 URL 없음")
    void manualHasNoImage() throws Exception {
        mockMvc.perform(post("/api/meals").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON).content(saveBody(null)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.imageUrl").doesNotExist());
    }

    @Test
    @DisplayName("타인 분석 작업 참조 — 404, 저장되지 않음")
    void otherJobBlocked() throws Exception {
        Member other = memberRepository.save(Member.signUp(Provider.KAKAO, "kakao-o2", "o2@kakao.com", "타인"));
        String otherKey = storageService.put(other.getId(), "jpeg".getBytes(), "image/jpeg");
        AnalysisJob otherJob = jobRepository.save(AnalysisJob.analyzing(other.getId(), otherKey));

        mockMvc.perform(post("/api/meals").header("Authorization", bearer)
                        .contentType(MediaType.APPLICATION_JSON).content(saveBody(otherJob.getId())))
                .andExpect(status().isNotFound());
    }
}
