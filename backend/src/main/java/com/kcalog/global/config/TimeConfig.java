package com.kcalog.global.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;
import java.time.ZoneId;

/**
 * 서비스의 "현재 시각" 단일 출처 — 한국 사용자 기준 KST.
 * 시간 의존 로직(나이 계산, 오늘 날짜 판정)은 반드시 이 Clock을 주입받는다 (서버 타임존 비의존).
 */
@Configuration
public class TimeConfig {

    @Bean
    Clock clock() {
        return Clock.system(ZoneId.of("Asia/Seoul"));
    }
}
