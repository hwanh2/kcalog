import { describe, expect, it } from 'vitest'
import { validateWeight } from './weightValidation'

describe('validateWeight', () => {
  it('정상 값은 숫자를 반환', () => {
    expect(validateWeight('70.5')).toEqual({ value: 70.5 })
    expect(validateWeight('30')).toEqual({ value: 30 })
  })

  it('범위 밖은 오류', () => {
    expect(validateWeight('29')).toHaveProperty('error')
    expect(validateWeight('251')).toHaveProperty('error')
    expect(validateWeight('')).toHaveProperty('error')
  })

  it('소수 둘째자리는 오류(NUMERIC(4,1) 거울)', () => {
    expect(validateWeight('70.55')).toHaveProperty('error')
    expect(validateWeight('70.5')).toEqual({ value: 70.5 })
  })
})
