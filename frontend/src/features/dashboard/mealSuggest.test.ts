import { describe, expect, it } from 'vitest'
import { suggestNextMealType } from './mealSuggest'

describe('suggestNextMealType', () => {
  it('아무것도 없으면 아침을 제안', () => {
    expect(suggestNextMealType([])).toBe('BREAKFAST')
  })

  it('아침·점심 기록됨 → 저녁 제안', () => {
    expect(suggestNextMealType(['BREAKFAST', 'LUNCH'])).toBe('DINNER')
  })

  it('점심만 기록됨 → 여전히 아침 제안(순서 우선)', () => {
    expect(suggestNextMealType(['LUNCH'])).toBe('BREAKFAST')
  })

  it('세 끼 모두 기록됨 → 간식 제안', () => {
    expect(suggestNextMealType(['BREAKFAST', 'LUNCH', 'DINNER'])).toBe('SNACK')
  })
})
