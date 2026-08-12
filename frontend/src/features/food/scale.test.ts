import { describe, expect, it } from 'vitest'
import { scaleNutrition, stepFor } from './scale'

const egg = { kcal: 70, carbG: 0.4, proteinG: 6.3, fatG: 4.8 }

describe('scaleNutrition', () => {
  it('기준 수량과 같으면 그대로', () => {
    expect(scaleNutrition(egg, 1, 1)).toEqual(egg)
  })

  it('수량을 늘리면 비례해 커진다', () => {
    expect(scaleNutrition(egg, 1, 2)).toEqual({ kcal: 140, carbG: 0.8, proteinG: 12.6, fatG: 9.6 })
  })

  it('수량을 줄이면 비례해 작아진다', () => {
    expect(scaleNutrition({ kcal: 310, carbG: 68, proteinG: 5.6, fatG: 0.6 }, 1, 0.5))
      .toEqual({ kcal: 155, carbG: 34, proteinG: 2.8, fatG: 0.3 })
  })

  it('g 단위처럼 기준이 100이어도 비례한다', () => {
    expect(scaleNutrition({ kcal: 165, carbG: 0, proteinG: 31, fatG: 3.6 }, 100, 180))
      .toEqual({ kcal: 297, carbG: 0, proteinG: 55.8, fatG: 6.5 })
  })

  it('kcal은 정수, 탄단지는 소수 첫째 자리로 반올림한다', () => {
    const scaled = scaleNutrition({ kcal: 105, carbG: 27.3, proteinG: 1.3, fatG: 0.4 }, 1, 1.5)

    expect(Number.isInteger(scaled.kcal)).toBe(true)
    expect(scaled.carbG).toBe(41)
    expect(scaled.proteinG).toBe(2)
  })

  it('수량이 0 이하거나 기준이 없으면 원본을 그대로 둔다', () => {
    expect(scaleNutrition(egg, 1, 0)).toEqual(egg)
    expect(scaleNutrition(egg, 0, 2)).toEqual(egg)
  })
})

describe('stepFor', () => {
  it('무게·부피는 10씩, 나머지는 0.5씩', () => {
    expect(stepFor('g')).toBe(10)
    expect(stepFor('ml')).toBe(10)
    expect(stepFor('개')).toBe(0.5)
    expect(stepFor('공기')).toBe(0.5)
  })

  it('표기 차이를 흡수한다', () => {
    expect(stepFor(' G ')).toBe(10)
  })
})
