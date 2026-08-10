package com.kcalog.domain.dashboard;

import com.kcalog.domain.dashboard.service.MacroTargetG;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 매크로 목표(g) 파생 계산 검증 (TDD, design D3):
 * kcal 목표 → 탄 50% / 단 30% / 지 20% (kcal 기준), 탄·단 4kcal/g · 지 9kcal/g로 g 환산, HALF_UP 반올림.
 * 목표 미설정(null)이면 세 값 모두 null.
 */
class MacroTargetGTest {

    @Test
    @DisplayName("1810 kcal — 탄 226 / 단 136 / 지 40 (목업 기준값과 일치)")
    void from1810() {
        MacroTargetG target = MacroTargetG.from(1810);
        // 탄 1810×0.5/4=226.25→226, 단 1810×0.3/4=135.75→136, 지 1810×0.2/9=40.22→40
        assertThat(target.carbG()).isEqualTo(226);
        assertThat(target.proteinG()).isEqualTo(136);
        assertThat(target.fatG()).isEqualTo(40);
    }

    @Test
    @DisplayName("2000 kcal — 탄 250 / 단 150 / 지 44")
    void from2000() {
        MacroTargetG target = MacroTargetG.from(2000);
        // 탄 250, 단 150, 지 2000×0.2/9=44.44→44
        assertThat(target.carbG()).isEqualTo(250);
        assertThat(target.proteinG()).isEqualTo(150);
        assertThat(target.fatG()).isEqualTo(44);
    }

    @Test
    @DisplayName("반올림은 HALF_UP — 226.5는 227로 올림")
    void roundsHalfUp() {
        // 탄 1812×0.5/4 = 226.5 → 227
        assertThat(MacroTargetG.from(1812).carbG()).isEqualTo(227);
    }

    @Test
    @DisplayName("목표 미설정(null) — 세 값 모두 null")
    void nullTarget() {
        MacroTargetG target = MacroTargetG.from(null);
        assertThat(target.carbG()).isNull();
        assertThat(target.proteinG()).isNull();
        assertThat(target.fatG()).isNull();
    }
}
