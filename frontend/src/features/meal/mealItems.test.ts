import { describe, expect, it } from 'vitest'
import type { AnalyzedItem } from '../../api/meal'
import {
  emptyItem,
  fromAnalyzed,
  isValidBox,
  shouldOverlay,
  toSaveItems,
  totals,
  validateItems,
} from './mealItems'
import type { EditableItem } from './mealItems'

const analyzed = (over: Partial<AnalyzedItem> = {}): AnalyzedItem => ({
  name: '김치찌개',
  kcal: 400,
  carbG: 30,
  proteinG: 20,
  fatG: 18,
  amount: 1,
  unit: '인분',
  box: { x: 0.1, y: 0.2, w: 0.3, h: 0.3 },
  corrected: false,
  ...over,
})

const editable = (over: Partial<EditableItem> = {}): EditableItem => ({
  name: '김치찌개',
  kcal: '400',
  carbG: '30',
  proteinG: '20',
  fatG: '18',
  quantity: '1',
  unit: '인분',
  box: { x: 0.1, y: 0.2, w: 0.3, h: 0.3 },
  remember: false,
  corrected: false,
  ...over,
})

describe('totals', () => {
  it('항목 합을 계산한다', () => {
    const t = totals([editable(), editable({ name: '공기밥', kcal: '250', carbG: '55', proteinG: '5', fatG: '1' })])
    expect(t).toEqual({ kcal: 650, carbG: 85, proteinG: 25, fatG: 19 })
  })

  it('빈·파싱 불가 값은 0으로 본다', () => {
    const t = totals([editable({ kcal: '', carbG: 'abc', proteinG: '', fatG: '' })])
    expect(t.kcal).toBe(0)
    expect(t.carbG).toBe(0)
  })
})

describe('isValidBox', () => {
  it('0~1 정규화 박스는 유효', () => {
    expect(isValidBox({ x: 0.1, y: 0.2, w: 0.3, h: 0.3 })).toBe(true)
  })

  it('null·범위 밖·경계 초과는 무효', () => {
    expect(isValidBox(null)).toBe(false)
    expect(isValidBox({ x: -0.1, y: 0.2, w: 0.3, h: 0.3 })).toBe(false)
    expect(isValidBox({ x: 0.9, y: 0.2, w: 0.3, h: 0.3 })).toBe(false) // x+w>1
    expect(isValidBox({ x: 0.1, y: 0.2, w: 0, h: 0.3 })).toBe(false) // w=0
  })
})

describe('shouldOverlay', () => {
  it('모든 박스 유효 + 신뢰도 임계 이상이면 오버레이', () => {
    expect(shouldOverlay([editable(), editable()], 0.8)).toBe(true)
  })

  it('신뢰도가 낮으면 목록형', () => {
    expect(shouldOverlay([editable()], 0.3)).toBe(false)
  })

  it('박스 하나라도 무효면 목록형', () => {
    expect(shouldOverlay([editable(), editable({ box: null })], 0.9)).toBe(false)
  })

  it('항목이 없으면 목록형', () => {
    expect(shouldOverlay([], 0.9)).toBe(false)
  })
})

describe('validateItems', () => {
  it('정상 항목들은 valid', () => {
    const r = validateItems([editable()])
    expect(r.valid).toBe(true)
    expect(r.formError).toBeNull()
  })

  it('항목이 없으면 formError', () => {
    const r = validateItems([])
    expect(r.valid).toBe(false)
    expect(r.formError).not.toBeNull()
  })

  it('이름 누락·범위 밖 값을 잡는다', () => {
    const r = validateItems([editable({ name: ' ', kcal: '99999', carbG: '2001' })])
    expect(r.valid).toBe(false)
    expect(r.itemErrors[0]).toHaveProperty('name')
    expect(r.itemErrors[0]).toHaveProperty('kcal')
    expect(r.itemErrors[0]).toHaveProperty('carbG')
  })

  it('매크로 소수 둘째자리는 거부(백엔드 @Digits(fraction=1) 거울), 소수 1자리는 허용', () => {
    expect(validateItems([editable({ carbG: '30.55' })]).valid).toBe(false)
    expect(validateItems([editable({ carbG: '30.5' })]).valid).toBe(true)
    expect(validateItems([editable({ proteinG: '20.0' })]).valid).toBe(true)
  })
})

describe('totals', () => {
  it('매크로 합계는 소수 1자리로 반올림해 부동소수 잔차를 감춘다', () => {
    const t = totals([editable({ carbG: '0.1' }), editable({ carbG: '0.2' })])
    expect(t.carbG).toBe(0.3) // 0.30000000000000004 아님
  })
})

describe('fromAnalyzed / toSaveItems', () => {
  it('분석 항목을 편집 항목으로, 저장 항목은 box를 제외한다', () => {
    const e = fromAnalyzed(analyzed())
    expect(e.kcal).toBe('400')
    expect(e.box).toEqual({ x: 0.1, y: 0.2, w: 0.3, h: 0.3 })

    const saved = toSaveItems([e])
    // 분석이 낸 섭취량(amount·unit)은 저장 항목의 quantity·unit으로 넘어간다
    expect(saved[0]).toEqual({
      name: '김치찌개',
      kcal: 400,
      carbG: 30,
      proteinG: 20,
      fatG: 18,
      quantity: 1,
      unit: '인분',
    })
    expect(saved[0]).not.toHaveProperty('box')
    expect(saved[0]).not.toHaveProperty('remember') // 기본은 기억 안 함 → 필드 생략
  })

  it('corrected는 분석 항목에서 이어받는다', () => {
    expect(fromAnalyzed(analyzed({ corrected: true })).corrected).toBe(true)
    expect(fromAnalyzed(analyzed()).remember).toBe(false)
  })

  it('remember=true면 저장 항목에 remember를 담는다', () => {
    const saved = toSaveItems([editable({ remember: true })])
    expect(saved[0].remember).toBe(true)
  })

  it('emptyItem은 빈 편집 항목', () => {
    expect(emptyItem()).toEqual({
      name: '',
      kcal: '',
      carbG: '',
      proteinG: '',
      fatG: '',
      quantity: '',
      unit: '',
      box: null,
      remember: false,
      corrected: false,
    })
  })
})
