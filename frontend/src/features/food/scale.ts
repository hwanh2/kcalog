import { round1 } from '../../lib/number'

/** 수량에 비례해 조정할 영양값 묶음 */
export interface Nutrition {
  kcal: number
  carbG: number
  proteinG: number
  fatG: number
}

/**
 * 기준 수량 대비 선택 수량으로 영양값을 비례 계산한다.
 * 카탈로그·즐겨찾기는 "1회분 기준값 × 선택 수량", AI 항목은 "현재 값 × (새 수량 / 이전 수량)"으로 쓴다.
 * kcal은 정수, 탄단지는 소수 1자리(백엔드 NUMERIC(5,1) 제약)로 맞춘다.
 */
export function scaleNutrition(base: Nutrition, baseQuantity: number, quantity: number): Nutrition {
  if (!(baseQuantity > 0) || !(quantity > 0)) {
    return { ...base }
  }
  const ratio = quantity / baseQuantity
  return {
    kcal: Math.round(base.kcal * ratio),
    carbG: round1(base.carbG * ratio),
    proteinG: round1(base.proteinG * ratio),
    fatG: round1(base.fatG * ratio),
  }
}

/**
 * 수량 조절의 증감 단위 — 단위마다 자연스러운 눈금이 다르다.
 * g·ml은 10씩, 나머지(개·공기·잔 등)는 0.5씩 움직인다.
 */
export function stepFor(unit: string): number {
  const normalized = unit.trim().toLowerCase()
  return normalized === 'g' || normalized === 'ml' ? 10 : 0.5
}
