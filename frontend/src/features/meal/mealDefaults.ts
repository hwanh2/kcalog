import type { MealType } from '../../api/meal'

/**
 * 현재 시각(로컬)으로 끼니 초기 선택값 추정 — 음식기록 탭에 들어왔을 때 어느 세그먼트가 눌려 있을지만 정한다.
 * 저장되는 끼니는 언제나 사용자가 눌러둔 세그먼트다(design D7).
 * 간식은 시간이 아니라 성격(끼니 사이)이라 자동 선택하지 않는다.
 */
export function defaultMealType(date: Date): MealType {
  const hour = date.getHours()
  if (hour < 5) return 'LATE_NIGHT' // 새벽 — 서비스 하루로는 전날의 야식
  if (hour < 11) return 'BREAKFAST'
  if (hour < 15) return 'LUNCH'
  if (hour < 21) return 'DINNER'
  return 'LATE_NIGHT'
}

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  BREAKFAST: '아침',
  LUNCH: '점심',
  DINNER: '저녁',
  SNACK: '간식',
  LATE_NIGHT: '야식',
}

/** 세그먼트 표시 순서 — 하루 흐름대로, 간식은 끼니 사이라 저녁 뒤에 둔다 */
export const MEAL_TYPE_ORDER: MealType[] = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK', 'LATE_NIGHT']
