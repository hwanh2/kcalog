package com.kcalog.domain.weight.entity;

import com.kcalog.global.common.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/** 하루 1회 체중 기록 — 같은 날 재기록은 upsert (member_id + log_date UNIQUE) */
@Entity
@Table(name = "weight_log")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WeightLog extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long memberId;

    @Column(nullable = false)
    private LocalDate logDate;

    @Column(nullable = false)
    private BigDecimal weightKg;

    public static WeightLog record(Long memberId, LocalDate logDate, BigDecimal weightKg) {
        WeightLog log = new WeightLog();
        log.memberId = memberId;
        log.logDate = logDate;
        log.weightKg = weightKg;
        return log;
    }

    public void updateWeight(BigDecimal weightKg) {
        this.weightKg = weightKg;
    }
}
