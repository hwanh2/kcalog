import { describe, expect, it } from 'vitest'
import { defaultSetName } from './favoriteMealName'

describe('defaultSetName', () => {
  it('여러 개면 "첫 항목 외 N개"', () => {
    expect(defaultSetName(['잡곡밥', '미역국', '계란찜', '김치', '나물'])).toBe('잡곡밥 외 4개')
  })

  it('하나면 그 이름 그대로 — "외 0개"는 어색하다', () => {
    expect(defaultSetName(['잡곡밥'])).toBe('잡곡밥')
  })

  it('빈 이름은 세지 않는다 — "+ 음식 추가"로 만든 빈 항목이 섞일 수 있다', () => {
    expect(defaultSetName(['잡곡밥', '  ', ''])).toBe('잡곡밥')
  })

  it('이름이 하나도 없으면 빈 문자열 — 사용자가 직접 적게 둔다', () => {
    expect(defaultSetName([])).toBe('')
    expect(defaultSetName(['', ' '])).toBe('')
  })
})
