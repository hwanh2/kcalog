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

/**
 * 여러 끼니가 섞인 목록의 정렬 — **끼니 순서가 먼저, 그 안에서 시각순**.
 *
 * 서버는 `eatenAt` 오름차순으로만 준다. 그런데 `eatenAt`은 저장한 순간이라(design: eatenAtFor)
 * 저녁 먹고 나서 아침을 뒤늦게 채워 넣으면 **아침이 저녁 아래로 간다.** 하루를 훑는 목록에서
 * 아침이 맨 아래 있으면 무엇을 빠뜨렸는지 알 수 없다.
 *
 * 원본을 건드리지 않는다 — 호출측이 넘긴 배열은 쿼리 캐시가 들고 있는 것이다.
 */
export function sortByMealOrder<T extends { mealType: MealType; eatenAt: string }>(meals: T[]): T[] {
  return [...meals].sort(
    (a, b) =>
      MEAL_TYPE_ORDER.indexOf(a.mealType) - MEAL_TYPE_ORDER.indexOf(b.mealType) ||
      a.eatenAt.localeCompare(b.eatenAt),
  )
}
