package com.kcalog.domain.meal.repository;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import javax.sql.DataSource;
import java.time.LocalDate;

/** 일일 분석 호출 카운터 — JPA 엔티티 없이 네이티브 SQL로만 접근하는 카운터 테이블 */
@Repository
public class AnalysisUsageRepository {

    private final JdbcClient jdbcClient;

    public AnalysisUsageRepository(DataSource dataSource) {
        this.jdbcClient = JdbcClient.create(dataSource);
    }

    /** 당일 호출 수 (없으면 0) */
    public int currentCount(Long memberId, LocalDate date) {
        return jdbcClient.sql("""
                        SELECT COALESCE(
                            (SELECT call_count FROM analysis_usage WHERE member_id = :memberId AND usage_date = :date),
                            0)
                        """)
                .param("memberId", memberId)
                .param("date", date)
                .query(Integer.class)
                .single();
    }

    /** 원자적 +1 upsert — 동시 호출에도 UNIQUE 충돌 없이 누적된다 */
    public void increment(Long memberId, LocalDate date) {
        jdbcClient.sql("""
                        INSERT INTO analysis_usage (member_id, usage_date, call_count)
                        VALUES (:memberId, :date, 1)
                        ON CONFLICT (member_id, usage_date)
                        DO UPDATE SET call_count = analysis_usage.call_count + 1
                        """)
                .param("memberId", memberId)
                .param("date", date)
                .update();
    }
}
