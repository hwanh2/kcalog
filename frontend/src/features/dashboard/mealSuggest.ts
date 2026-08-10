import type { MealType } from '../../api/meal'

/** 오늘 이미 기록된 끼니들을 보고 다음에 촬영할 끼니를 제안한다.
 *  아침→점심→저녁 순으로 아직 없는 첫 끼니를 고르고, 세 끼가 모두 있으면 간식을 제안한다.
 *  순수 함수 — 시각이 아니라 "무엇을 기록했는가"만 본다(design D5). */
export function suggestNextMealType(loggedTypes: MealType[]): MealType {
  const order: MealType[] = ['BREAKFAST', 'LUNCH', 'DINNER']
  for (const type of order) {
    if (!loggedTypes.includes(type)) return type
  }
  return 'SNACK'
}
