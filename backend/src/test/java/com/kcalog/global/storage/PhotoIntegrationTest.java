package com.kcalog.global.storage;

import com.kcalog.IntegrationTest;
import com.kcalog.domain.auth.service.JwtService;
import com.kcalog.domain.member.entity.Member;
import com.kcalog.domain.member.entity.Provider;
import com.kcalog.domain.member.repository.MemberRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** 사진 프록시 — 소유자만 조회, 타인·미존재 404. 스토리지는 인메모리 fake */
@IntegrationTest
@Transactional
class PhotoIntegrationTest {

    @Autowired
    MockMvc mockMvc;
    @Autowired
    MemberRepository memberRepository;
    @Autowired
    JwtService jwtService;
    @Autowired
    StorageService storageService;

    Member owner;
    Member other;
    String ownerBearer;
    String otherBearer;

    @BeforeEach
    void setUp() {
        owner = memberRepository.save(Member.signUp(Provider.KAKAO, "kakao-owner", "o@kakao.com", "주인"));
        other = memberRepository.save(Member.signUp(Provider.KAKAO, "kakao-other", "x@kakao.com", "타인"));
        ownerBearer = "Bearer " + jwtService.issueAccessToken(owner.getId());
        otherBearer = "Bearer " + jwtService.issueAccessToken(other.getId());
    }

    @Test
    @DisplayName("소유자는 자신의 사진을 조회한다")
    void ownerReadsPhoto() throws Exception {
        String key = storageService.put(owner.getId(), "jpeg-bytes".getBytes(), "image/jpeg");

        mockMvc.perform(get("/api/photos/" + key).header("Authorization", ownerBearer))
                .andExpect(status().isOk())
                .andExpect(content().bytes("jpeg-bytes".getBytes()));
    }

    @Test
    @DisplayName("타인의 사진 key로 접근하면 404")
    void otherBlocked() throws Exception {
        String key = storageService.put(owner.getId(), "jpeg-bytes".getBytes(), "image/jpeg");

        mockMvc.perform(get("/api/photos/" + key).header("Authorization", otherBearer))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("없는 사진은 404")
    void missing404() throws Exception {
        mockMvc.perform(get("/api/photos/" + owner.getId() + "/nope").header("Authorization", ownerBearer))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("인증 없는 요청은 401")
    void requiresAuth() throws Exception {
        mockMvc.perform(get("/api/photos/1/x"))
                .andExpect(status().isUnauthorized());
    }
}
