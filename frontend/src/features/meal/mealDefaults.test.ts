import { describe, expect, it } from 'vitest'
import { MEAL_TYPE_LABELS, MEAL_TYPE_ORDER, defaultMealType } from './mealDefaults'

describe('defaultMealType', () => {
  const at = (hour: number) => defaultMealType(new Date(2026, 7, 6, hour, 0))

  it('시간대별 끼니 초기 선택값', () => {
    expect(at(8)).toBe('BREAKFAST')
    expect(at(12)).toBe('LUNCH')
    expect(at(19)).toBe('DINNER')
    expect(at(23)).toBe('LATE_NIGHT')
  })

  it('경계 — 5시는 아침, 11시는 점심, 15시는 저녁, 21시는 야식', () => {
    expect(at(5)).toBe('BREAKFAST')
    expect(at(11)).toBe('LUNCH')
    expect(at(15)).toBe('DINNER')
    expect(at(21)).toBe('LATE_NIGHT')
  })

  it('새벽(0~5시)은 야식 — 서비스 하루로는 전날에 속한다', () => {
    expect(at(0)).toBe('LATE_NIGHT')
    expect(at(2)).toBe('LATE_NIGHT')
    expect(at(4)).toBe('LATE_NIGHT')
  })

  it('간식은 자동 선택하지 않는다 — 시간이 아니라 성격이라서', () => {
    for (let hour = 0; hour < 24; hour++) {
      expect(at(hour)).not.toBe('SNACK')
    }
  })
})

describe('끼니 목록', () => {
  it('세그먼트는 5개이고 모두 라벨이 있다', () => {
    expect(MEAL_TYPE_ORDER).toHaveLength(5)
    expect(MEAL_TYPE_ORDER.map((t) => MEAL_TYPE_LABELS[t])).toEqual(['아침', '점심', '저녁', '간식', '야식'])
  })
})
