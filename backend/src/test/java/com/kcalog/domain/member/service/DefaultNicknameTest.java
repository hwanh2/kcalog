package com.kcalog.domain.member.service;

import com.kcalog.domain.member.entity.Goal;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.RepeatedTest;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class DefaultNicknameTest {

    @Test
    @DisplayName("감량을 고르면 익명의 다이어터")
    void cut() {
        assertThat(DefaultNickname.of(Goal.CUT, 1234)).isEqualTo("익명의 다이어터1234");
    }

    @Test
    @DisplayName("유지를 고르면 익명의 유지어터")
    void maintain() {
        assertThat(DefaultNickname.of(Goal.MAINTAIN, 1234)).isEqualTo("익명의 유지어터1234");
    }

    @Test
    @DisplayName("증량을 고르면 익명의 증량러")
    void bulk() {
        assertThat(DefaultNickname.of(Goal.BULK, 1234)).isEqualTo("익명의 증량러1234");
    }

    @RepeatedTest(20)
    @DisplayName("무작위 숫자는 늘 네 자리다")
    void randomIsFourDigits() {
        assertThat(DefaultNickname.random(Goal.CUT)).matches("익명의 다이어터\\d{4}");
    }
}
