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
