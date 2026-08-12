import { describe, expect, it } from 'vitest'
import type { Food } from '../../api/food'
import { bigramJaccard, searchFoods } from './search'

function food(name: string, overrides: Partial<Food> = {}): Food {
  return {
    id: 1,
    source: 'CATALOG',
    name,
    emoji: '🍚',
    aliases: [],
    quantity: 1,
    unit: '개',
    kcal: 100,
    carbG: 10,
    proteinG: 5,
    fatG: 2,
    ...overrides,
  }
}

const CATALOG = [
  food('삶은달걀', { id: 1, aliases: ['계란', '에그', '삶은계란'] }),
  food('흰쌀밥', { id: 2, aliases: ['쌀밥', '공기밥', '밥'] }),
  food('닭가슴살', { id: 3 }),
  food('닭가슴살 샐러드', { id: 4 }),
  food('고구마', { id: 5, aliases: ['군고구마'] }),
]

const names = (list: Food[]) => list.map((f) => f.name)

describe('searchFoods', () => {
  it('빈 검색어면 전체를 순서 그대로 돌려준다', () => {
    expect(searchFoods(CATALOG, '')).toEqual(CATALOG)
    expect(searchFoods(CATALOG, '   ')).toEqual(CATALOG)
  })

  it('부분 일치로 찾는다', () => {
    expect(names(searchFoods(CATALOG, '가슴살'))).toEqual(['닭가슴살', '닭가슴살 샐러드'])
  })

  it('띄어쓰기·대소문자 차이를 흡수한다', () => {
    expect(names(searchFoods(CATALOG, '닭 가슴살'))).toEqual(['닭가슴살', '닭가슴살 샐러드'])
  })

  it('별칭으로도 찾는다 — 유사도로는 잡을 수 없는 동의어', () => {
    expect(names(searchFoods(CATALOG, '계란'))).toEqual(['삶은달걀'])
    expect(names(searchFoods(CATALOG, '공기밥'))).toEqual(['흰쌀밥'])
  })

  it('정확 일치 → 앞부분 일치 → 부분 일치 순으로 정렬한다', () => {
    const list = [food('군고구마', { id: 1 }), food('고구마말랭이', { id: 2 }), food('고구마', { id: 3 })]

    expect(names(searchFoods(list, '고구마'))).toEqual(['고구마', '고구마말랭이', '군고구마'])
  })

  it('이름 일치가 별칭 일치보다 앞선다', () => {
    const list = [food('군고구마', { id: 1, aliases: ['고구마'] }), food('고구마', { id: 2 })]

    expect(names(searchFoods(list, '고구마'))).toEqual(['고구마', '군고구마'])
  })

  it('오타는 유사도 폴백으로 잡는다 — 다른 방법으로 결과가 없을 때만', () => {
    // 이름이 더 긴 "닭가슴살 샐러드"는 겹치는 조각 비율이 낮아 임계에 못 미친다(다른 음식을 끌어오지 않는다)
    expect(names(searchFoods(CATALOG, '닥가슴살'))).toEqual(['닭가슴살'])
  })

  it('유사도가 임계 미만이면 빈 결과 — 아무거나 들이밀지 않는다', () => {
    expect(searchFoods(CATALOG, '짜장라면')).toEqual([])
  })
})

describe('bigramJaccard', () => {
  it('같은 문자열은 1', () => {
    expect(bigramJaccard('닭가슴살', '닭가슴살')).toBe(1)
  })

  it('한 글자 오타는 절반 이상 겹친다', () => {
    expect(bigramJaccard('닥가슴살', '닭가슴살')).toBeGreaterThanOrEqual(0.5)
  })

  it('겹치는 음절이 없으면 0', () => {
    expect(bigramJaccard('바나나', '고구마')).toBe(0)
  })

  it('두 글자 미만은 완전 일치로만 판정한다', () => {
    expect(bigramJaccard('밥', '밥')).toBe(1)
    expect(bigramJaccard('밥', '죽')).toBe(0)
  })
})
