package com.kcalog.domain.coaching.repository;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import javax.sql.DataSource;
import java.time.LocalDate;

/**
 * 회원당 일일 코치 채팅 호출 카운터 — LLM 비용 가드레일. JPA 엔티티 없이 네이티브 SQL 카운터.
 * 초기화(대화 삭제)가 이 카운터를 리셋하지 않아 상한 우회가 불가하다.
 * 실패한 호출은 세지 않도록 성공 시에만 증가시킨다(AnalysisUsage와 달리 증가 시점이 성공 후).
 */
@Repository
public class CoachingChatUsageRepository {

    private final JdbcClient jdbcClient;

    public CoachingChatUsageRepository(DataSource dataSource) {
        this.jdbcClient = JdbcClient.create(dataSource);
    }

    /** 오늘까지의 사용 횟수 — 행이 없으면 0 */
    public int count(Long memberId, LocalDate date) {
        return jdbcClient.sql("""
                        SELECT COALESCE(
                            (SELECT call_count FROM coaching_chat_usage
                             WHERE member_id = :memberId AND usage_date = :date), 0)
                        """)
                .param("memberId", memberId)
                .param("date", date)
                .query(Integer.class)
                .single();
    }

    /** 성공한 응답 후 +1 upsert */
    public void increment(Long memberId, LocalDate date) {
        jdbcClient.sql("""
                        INSERT INTO coaching_chat_usage (member_id, usage_date, call_count)
                        VALUES (:memberId, :date, 1)
                        ON CONFLICT (member_id, usage_date)
                        DO UPDATE SET call_count = coaching_chat_usage.call_count + 1
                        """)
                .param("memberId", memberId)
                .param("date", date)
                .update();
    }
}
