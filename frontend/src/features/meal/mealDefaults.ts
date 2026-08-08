import type { MealType } from '../../api/meal'

/** 현재 시각(로컬)으로 끼니 기본값 추정 — 사용자가 바꿀 수 있는 초기값일 뿐 */
export function defaultMealType(date: Date): MealType {
  const hour = date.getHours()
  if (hour < 11) return 'BREAKFAST'
  if (hour < 15) return 'LUNCH'
  if (hour < 21) return 'DINNER'
  return 'SNACK'
}

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  BREAKFAST: '아침',
  LUNCH: '점심',
  DINNER: '저녁',
  SNACK: '간식',
}

// 백엔드 MealValidation의 거울
export const KCAL_MAX = 10_000
export const MACRO_MAX = 2000

export type NutritionErrors = Partial<Record<'totalKcal' | 'carbG' | 'proteinG' | 'fatG', string>>

/** 저장 전 영양값 검증 — 음수·상한 초과 차단 */
export function validateNutrition(values: {
  totalKcal: number | null
  carbG: number | null
  proteinG: number | null
  fatG: number | null
}): NutritionErrors {
  const errors: NutritionErrors = {}
  const check = (v: number | null, max: number) => v === null || v < 0 || v > max
  if (check(values.totalKcal, KCAL_MAX)) errors.totalKcal = `0~${KCAL_MAX} 범위여야 합니다`
  if (check(values.carbG, MACRO_MAX)) errors.carbG = `0~${MACRO_MAX} 범위여야 합니다`
  if (check(values.proteinG, MACRO_MAX)) errors.proteinG = `0~${MACRO_MAX} 범위여야 합니다`
  if (check(values.fatG, MACRO_MAX)) errors.fatG = `0~${MACRO_MAX} 범위여야 합니다`
  return errors
}
