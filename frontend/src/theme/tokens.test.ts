import { describe, expect, it } from 'vitest'
import { contrastRatio, meetsAA } from '../lib/contrast'
import { INK, KNOWN_EXCEPTIONS, PAIRS, SURFACE } from './tokens'

describe('색 토큰 대비', () => {
  it.each(PAIRS)('$name — 본문 기준 4.5:1을 넘는다', ({ ink, on }) => {
    const ratio = contrastRatio(ink, on)
    expect(meetsAA(ratio), `${ratio.toFixed(2)}:1`).toBe(true)
  })
})

describe('의도적 예외', () => {
  // 예외를 "없는 셈" 치면 다음 사람이 같은 조합을 무심코 늘린다.
  // 목록에 있는 것만, 그리고 정말로 미달인 것만 예외로 인정한다.
  it.each(KNOWN_EXCEPTIONS)('$name — 미달이지만 유지하기로 한 조합이다 ($why)', ({ ink, on }) => {
    expect(meetsAA(contrastRatio(ink, on))).toBe(false)
  })

  it('예외는 PAIRS와 겹치지 않는다 — 같은 조합이 양쪽에 있으면 판정이 모순된다', () => {
    const keys = new Set(PAIRS.map((p) => `${p.ink}/${p.on}`))
    for (const e of KNOWN_EXCEPTIONS) expect(keys.has(`${e.ink}/${e.on}`)).toBe(false)
  })

  it('브랜드 버튼은 폰트를 키워도 해결되지 않는다 — 큰 글씨 완화 기준에도 미달', () => {
    // 이 사실이 "글씨를 키우면 되지 않나?"라는 다음 질문을 미리 막는다
    expect(meetsAA(contrastRatio(INK.onBrand, SURFACE.brand), { large: true })).toBe(false)
  })
})

describe('면 토큰', () => {
  it('밝은 값을 유지한다 — 목업 v2의 인상은 면에서 나온다', () => {
    // 이 값들이 어두워지면 매크로 막대·버튼·FAB의 성격이 바뀐다.
    // 대비 기준은 텍스트에만 걸리므로 면은 밝게 두는 것이 맞다.
    expect(SURFACE.brand).toBe('#ff6b00')
    expect(SURFACE.carb).toBe('#f59e0b')
    expect(SURFACE.protein).toBe('#ef4444')
    expect(SURFACE.fat).toBe('#06b6d4')
  })

  it('면 색은 글씨 색과 다른 값이다 — 같아지면 이원화가 무너진 것', () => {
    expect(SURFACE.brand).not.toBe(INK.brandInk)
    expect(SURFACE.carb).not.toBe(INK.carbInk)
    expect(SURFACE.protein).not.toBe(INK.proteinInk)
    expect(SURFACE.fat).not.toBe(INK.fatInk)
  })
})

describe('카운트 배지', () => {
  it('비활성 배지(border 배경)도 글씨만 고쳐서 통과한다 — 배경은 건드리지 않는다', () => {
    // 설계 단계에서는 배경(border)까지 낮춰야 한다고 봤으나(D2),
    // muted를 slate-500이 아닌 #5b6878로 잡으면서 border 위에서도 4.61:1이 나온다.
    expect(meetsAA(contrastRatio(INK.muted, SURFACE.border))).toBe(true)
  })
})
