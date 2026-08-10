import { describe, expect, it } from 'vitest'
import { weightSummary } from './weightSummary'

describe('weightSummary', () => {
  it('기록이 없으면 null', () => {
    expect(weightSummary([])).toBeNull()
  })

  it('기록이 하나면 delta 0', () => {
    expect(weightSummary([{ logDate: '2026-08-10', weightKg: 68.4 }])).toEqual({ latest: 68.4, delta: 0 })
  })

  it('7일 전 대비 변화량 — 68.7 → 68.4 = -0.3', () => {
    const entries = [
      { logDate: '2026-08-03', weightKg: 68.7 },
      { logDate: '2026-08-06', weightKg: 68.6 },
      { logDate: '2026-08-10', weightKg: 68.4 },
    ]
    // 최신 8/10 기준 7일 이전(≤8/03)의 가장 최근 = 8/03(68.7) → 68.4-68.7 = -0.3
    expect(weightSummary(entries)).toEqual({ latest: 68.4, delta: -0.3 })
  })

  it('7일 이전 기록이 없으면 창 내 최초 기록 기준', () => {
    const entries = [
      { logDate: '2026-08-08', weightKg: 70.0 },
      { logDate: '2026-08-10', weightKg: 69.5 },
    ]
    expect(weightSummary(entries)).toEqual({ latest: 69.5, delta: -0.5 })
  })
})
