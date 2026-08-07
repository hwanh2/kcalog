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

    /**
     * 원자적 +1 upsert 후 증가된 값을 반환한다 (RETURNING).
     * 검사-후-증가(TOCTOU) 없이 단일 연산으로 처리해, 동시 요청에도 상한 판정이 정확하다.
     */
    public int incrementAndGet(Long memberId, LocalDate date) {
        return jdbcClient.sql("""
                        INSERT INTO analysis_usage (member_id, usage_date, call_count)
                        VALUES (:memberId, :date, 1)
                        ON CONFLICT (member_id, usage_date)
                        DO UPDATE SET call_count = analysis_usage.call_count + 1
                        RETURNING call_count
                        """)
                .param("memberId", memberId)
                .param("date", date)
                .query(Integer.class)
                .single();
    }
}
