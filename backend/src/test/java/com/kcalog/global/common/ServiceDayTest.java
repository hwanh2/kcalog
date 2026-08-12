package com.kcalog.global.common;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("서비스 하루(05:00 경계)")
class ServiceDayTest {

    private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

    /** 서울 시간 문자열을 Instant로 — 테스트 가독성용 */
    private static Instant seoul(String isoLocalDateTime) {
        return java.time.LocalDateTime.parse(isoLocalDateTime).atZone(SEOUL).toInstant();
    }

    @Nested
    @DisplayName("순간이 속한 날짜 판정")
    class DateOf {

        @Test
        @DisplayName("새벽 2시는 전날의 기록이다")
        void beforeBoundary() {
            assertThat(ServiceDay.of(seoul("2026-08-12T02:00:00"), SEOUL))
                    .isEqualTo(LocalDate.of(2026, 8, 11));
        }

        @Test
        @DisplayName("04:59는 아직 전날이다")
        void justBeforeBoundary() {
            assertThat(ServiceDay.of(seoul("2026-08-12T04:59:59"), SEOUL))
                    .isEqualTo(LocalDate.of(2026, 8, 11));
        }

        @Test
        @DisplayName("05:00부터 새 날이다")
        void atBoundary() {
            assertThat(ServiceDay.of(seoul("2026-08-12T05:00:00"), SEOUL))
                    .isEqualTo(LocalDate.of(2026, 8, 12));
        }

        @Test
        @DisplayName("자정 직전은 그날에 그대로 속한다")
        void lateNight() {
            assertThat(ServiceDay.of(seoul("2026-08-12T23:59:59"), SEOUL))
                    .isEqualTo(LocalDate.of(2026, 8, 12));
        }
    }

    @Nested
    @DisplayName("하루 구간")
    class Range {

        @Test
        @DisplayName("구간은 05:00에서 다음 날 05:00까지다")
        void boundaries() {
            LocalDate date = LocalDate.of(2026, 8, 11);

            assertThat(ServiceDay.startOf(date, SEOUL)).isEqualTo(seoul("2026-08-11T05:00:00"));
            assertThat(ServiceDay.endOf(date, SEOUL)).isEqualTo(seoul("2026-08-12T05:00:00"));
        }

        @Test
        @DisplayName("구간의 끝은 포함하지 않는다 — 다음 날 시작과 맞물린다")
        void halfOpen() {
            LocalDate date = LocalDate.of(2026, 8, 11);

            assertThat(ServiceDay.endOf(date, SEOUL)).isEqualTo(ServiceDay.startOf(date.plusDays(1), SEOUL));
        }

        @Test
        @DisplayName("구간 안의 순간은 그 날짜로 판정된다")
        void consistentWithDateOf() {
            LocalDate date = LocalDate.of(2026, 8, 11);
            Instant start = ServiceDay.startOf(date, SEOUL);
            Instant justBeforeEnd = ServiceDay.endOf(date, SEOUL).minusSeconds(1);

            assertThat(ServiceDay.of(start, SEOUL)).isEqualTo(date);
            assertThat(ServiceDay.of(justBeforeEnd, SEOUL)).isEqualTo(date);
        }
    }

    @Nested
    @DisplayName("오늘 판정")
    class Today {

        @Test
        @DisplayName("새벽 3시의 '오늘'은 전날이다")
        void beforeBoundary() {
            Clock clock = Clock.fixed(seoul("2026-08-12T03:00:00"), SEOUL);

            assertThat(ServiceDay.today(clock)).isEqualTo(LocalDate.of(2026, 8, 11));
        }

        @Test
        @DisplayName("아침 9시의 '오늘'은 그날이다")
        void afterBoundary() {
            Clock clock = Clock.fixed(seoul("2026-08-12T09:00:00"), SEOUL);

            assertThat(ServiceDay.today(clock)).isEqualTo(LocalDate.of(2026, 8, 12));
        }
    }
}
