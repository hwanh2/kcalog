package com.kcalog.domain.member.service;

import com.kcalog.domain.member.entity.Goal;

import java.util.concurrent.ThreadLocalRandom;

/**
 * 온보딩을 마칠 때 붙는 기본 닉네임 (add-apps-in-toss D14). 목표에서 이름을 따고 네 자리 숫자를 붙인다.
 * 토스 회원은 이름을 받지 않고, 카카오 닉네임은 실명인 경우가 많아 웹과 토스 모두 이 이름으로 시작한다.
 * 겹쳐도 된다. 닉네임은 화면에 부르는 이름일 뿐 식별자가 아니다.
 */
final class DefaultNickname {

    private DefaultNickname() {
    }

    static String of(Goal goal, int number) {
        String role = switch (goal) {
            case CUT -> "다이어터";
            case MAINTAIN -> "유지어터";
            case BULK -> "증량러";
        };
        return "익명의 " + role + number;
    }

    static String random(Goal goal) {
        return of(goal, ThreadLocalRandom.current().nextInt(1000, 10_000));
    }
}
