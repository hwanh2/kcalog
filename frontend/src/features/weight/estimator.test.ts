import { describe, expect, it } from 'vitest'
import {
  daysUntil,
  formatKoreanDate,
  prevDelta,
  progressFraction,
  sliceByRange,
} from './estimator'
import type { WeightPoint } from '../../api/weight'

const p = (logDate: string, weightKg: number): WeightPoint => ({ logDate, weightKg, trendKg: weightKg })

describe('sliceByRange', () => {
  const points = Array.from({ length: 40 }, (_, i) => p(`2026-07-${String(i + 1).padStart(2, '0')}`, 70))
    .filter((x) => x.logDate <= '2026-07-31')
  it('1주는 마지막 7일만', () => {
    const sliced = sliceByRange(points, '1주')
    expect(sliced).toHaveLength(7)
    expect(sliced[0].logDate).toBe('2026-07-25')
  })
  it('3월은 전부(90일 이내)', () => {
    expect(sliceByRange(points, '3월')).toHaveLength(points.length)
  })
})

describe('prevDelta', () => {
  it('최신 − 직전 기록', () => {
    expect(prevDelta([p('2026-08-07', 71), p('2026-08-08', 70.6)])).toBe(-0.4)
  })
  it('점 1개면 null', () => {
    expect(prevDelta([p('2026-08-08', 70)])).toBeNull()
  })
})

describe('progressFraction', () => {
  it('시작→목표 사이 진행률(감량)', () => {
    // 시작 72, 목표 65, 현재 68.5 → (68.5-72)/(65-72)=3.5/7=0.5
    expect(progressFraction(72, 68.5, 65)).toBeCloseTo(0.5, 5)
  })
  it('범위를 벗어나면 0~1로 클램프', () => {
    expect(progressFraction(72, 73, 65)).toBe(0)
    expect(progressFraction(72, 64, 65)).toBe(1)
  })
})

describe('daysUntil / formatKoreanDate', () => {
  it('남은 일수', () => {
    expect(daysUntil('2026-08-10', '2026-09-03')).toBe(24)
  })
  it('한국어 날짜·요일', () => {
    expect(formatKoreanDate('2026-09-03')).toBe('9월 3일 (목)')
  })
})
