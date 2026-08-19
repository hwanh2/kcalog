import { describe, expect, it } from 'vitest'
import { ageFromBirthYear, birthYearFromAge } from './age'

/**
 * 화면이 쓰는 나이는 **세는나이**다. 2002년생은 2026년에 25세.
 * 온보딩 입력과 프로필 표시가 이 함수 하나를 공유해야 입력한 25가 24로 보이지 않는다.
 */
describe('나이 ↔ 출생연도', () => {
  const now = new Date('2026-08-18T00:00:00Z')

  it('2002년생은 2026년에 25세. 만 나이가 아니다', () => {
    expect(ageFromBirthYear(2002, now)).toBe(25)
  })

  it('25세를 입력하면 2002년생으로 저장된다', () => {
    expect(birthYearFromAge(25, now)).toBe(2002)
  })

  it('두 방향이 서로를 되돌린다. 입력한 나이가 화면에 그대로 다시 보여야 한다', () => {
    for (let age = 10; age <= 100; age += 1) {
      expect(ageFromBirthYear(birthYearFromAge(age, now), now)).toBe(age)
    }
  })

  it('그 해에 태어나면 1세', () => {
    expect(ageFromBirthYear(2026, now)).toBe(1)
  })
})
