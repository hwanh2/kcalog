import { describe, expect, it } from 'vitest'
import { addDays, todayServiceDate } from './date'

describe('todayServiceDate', () => {
  /** KST 시각을 UTC Date로 — 테스트 가독성용 (KST = UTC+9, DST 없음) */
  const kst = (iso: string) => new Date(`${iso}+09:00`)

  it('05시 이후는 그날', () => {
    expect(todayServiceDate(kst('2026-08-12T05:00:00'))).toBe('2026-08-12')
    expect(todayServiceDate(kst('2026-08-12T13:30:00'))).toBe('2026-08-12')
    expect(todayServiceDate(kst('2026-08-12T23:59:59'))).toBe('2026-08-12')
  })

  it('05시 이전 새벽은 전날 — 야식이 다음 날로 새지 않게', () => {
    expect(todayServiceDate(kst('2026-08-12T02:00:00'))).toBe('2026-08-11')
    expect(todayServiceDate(kst('2026-08-12T04:59:59'))).toBe('2026-08-11')
    expect(todayServiceDate(kst('2026-08-12T00:00:00'))).toBe('2026-08-11')
  })

  it('월·연 경계도 하루 전으로 넘어간다', () => {
    expect(todayServiceDate(kst('2026-09-01T03:00:00'))).toBe('2026-08-31')
    expect(todayServiceDate(kst('2027-01-01T01:00:00'))).toBe('2026-12-31')
  })
})

describe('addDays', () => {
  it('일수를 더하고 뺀다', () => {
    expect(addDays('2026-08-12', 1)).toBe('2026-08-13')
    expect(addDays('2026-08-12', -1)).toBe('2026-08-11')
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01')
  })
})
