package com.kcalog.domain.coaching.repository;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import javax.sql.DataSource;
import java.time.LocalDate;

/**
 * 회원당 일일 코치 채팅 호출 카운터 — LLM 비용 가드레일. JPA 엔티티 없이 네이티브 SQL 카운터.
 * 초기화(대화 삭제)가 이 카운터를 리셋하지 않아 상한 우회가 불가하다.
 * <p>
 * 검사와 증가를 {@link #tryReserve}로 합쳐 단일 원자적 연산으로 선점한다 — 검사 후 증가(TOCTOU)로
 * 두면 스트리밍이 끝날 때까지(최대 60초) 창이 벌어져 동시 요청이 모두 상한을 통과한다.
 * '실패는 과금하지 않는다'는 정책은 스트리밍 실패 시 {@link #release}로 되돌려 유지한다.
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

    /**
     * 상한 안에서 사용량 1건을 원자적으로 선점한다. 성공하면 true, 이미 상한이면 false.
     * 갱신 시 {@code WHERE call_count < :limit} 가드가 걸려, 초과 시 갱신 행이 없어 빈 결과가 된다.
     */
    public boolean tryReserve(Long memberId, LocalDate date, int limit) {
        if (limit <= 0) {
            return false;
        }
        return jdbcClient.sql("""
                        INSERT INTO coaching_chat_usage (member_id, usage_date, call_count)
                        VALUES (:memberId, :date, 1)
                        ON CONFLICT (member_id, usage_date)
                        DO UPDATE SET call_count = coaching_chat_usage.call_count + 1
                        WHERE coaching_chat_usage.call_count < :limit
                        RETURNING call_count
                        """)
                .param("memberId", memberId)
                .param("date", date)
                .param("limit", limit)
                .query(Integer.class)
                .optional()
                .isPresent();
    }

    /** 선점 취소 — 스트리밍이 실패해 과금하지 않을 때 되돌린다(0 미만으로 내려가지 않음) */
    public void release(Long memberId, LocalDate date) {
        jdbcClient.sql("""
                        UPDATE coaching_chat_usage
                        SET call_count = GREATEST(call_count - 1, 0)
                        WHERE member_id = :memberId AND usage_date = :date
                        """)
                .param("memberId", memberId)
                .param("date", date)
                .update();
    }
}
