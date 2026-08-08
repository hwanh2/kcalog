import { describe, expect, it } from 'vitest'
import { defaultMealType, validateNutrition } from './mealDefaults'

describe('defaultMealType', () => {
  const at = (hour: number) => defaultMealType(new Date(2026, 7, 6, hour, 0))

  it('시간대별 끼니 기본값', () => {
    expect(at(8)).toBe('BREAKFAST')
    expect(at(12)).toBe('LUNCH')
    expect(at(19)).toBe('DINNER')
    expect(at(23)).toBe('SNACK')
  })

  it('경계 — 11시는 점심, 15시는 저녁, 21시는 간식', () => {
    expect(at(11)).toBe('LUNCH')
    expect(at(15)).toBe('DINNER')
    expect(at(21)).toBe('SNACK')
  })
})

describe('validateNutrition', () => {
  const valid = { totalKcal: 650, carbG: 75, proteinG: 30, fatG: 22 }

  it('정상 값은 오류 없음', () => {
    expect(validateNutrition(valid)).toEqual({})
  })

  it('음수·null·상한 초과를 잡는다', () => {
    expect(validateNutrition({ ...valid, totalKcal: -1 })).toHaveProperty('totalKcal')
    expect(validateNutrition({ ...valid, carbG: null })).toHaveProperty('carbG')
    expect(validateNutrition({ ...valid, totalKcal: 10_001 })).toHaveProperty('totalKcal')
    expect(validateNutrition({ ...valid, fatG: 2001 })).toHaveProperty('fatG')
  })
})
