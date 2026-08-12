import { describe, expect, it } from 'vitest'
import { contrastRatio, meetsAA, relativeLuminance } from './contrast'

describe('상대 휘도', () => {
  it('검정은 0, 흰색은 1이다', () => {
    expect(relativeLuminance('#000000')).toBe(0)
    expect(relativeLuminance('#ffffff')).toBe(1)
  })

  it('짧은 표기(#fff)도 같은 값으로 읽는다', () => {
    expect(relativeLuminance('#fff')).toBe(relativeLuminance('#ffffff'))
  })

  it('대소문자를 가리지 않는다', () => {
    expect(relativeLuminance('#FF6B00')).toBe(relativeLuminance('#ff6b00'))
  })
})

describe('대비비', () => {
  it('검정과 흰색은 21:1로 최대다', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5)
  })

  it('같은 색끼리는 1:1이다', () => {
    expect(contrastRatio('#ff6b00', '#ff6b00')).toBeCloseTo(1, 5)
  })

  it('순서를 바꿔도 같다 — 어느 쪽이 배경이든 대비는 하나다', () => {
    expect(contrastRatio('#64748b', '#ffffff')).toBeCloseTo(contrastRatio('#ffffff', '#64748b'), 10)
  })

  it('알려진 값과 맞는다 — slate-500 on white', () => {
    expect(contrastRatio('#64748b', '#ffffff')).toBeCloseTo(4.76, 1)
  })
})

describe('AA 판정', () => {
  it('본문은 4.5:1 이상이어야 통과한다', () => {
    expect(meetsAA(4.5)).toBe(true)
    expect(meetsAA(4.49)).toBe(false)
  })

  it('큰 글씨는 3:1 이상이면 통과한다', () => {
    expect(meetsAA(3, { large: true })).toBe(true)
    expect(meetsAA(2.99, { large: true })).toBe(false)
  })

  it('목업에서 가져온 밝은 값들은 본문 기준을 넘지 못한다', () => {
    // 이 change가 존재하는 이유 — 면으로는 써도 되지만 글씨로는 못 쓴다
    expect(meetsAA(contrastRatio('#94a3b8', '#ffffff'))).toBe(false) // muted (구)
    expect(meetsAA(contrastRatio('#f59e0b', '#ffffff'))).toBe(false) // carb
    expect(meetsAA(contrastRatio('#06b6d4', '#ffffff'))).toBe(false) // fat
    expect(meetsAA(contrastRatio('#ff6b00', '#ffffff'))).toBe(false) // brand
  })
})
