import { api } from './client'

/**
 * 끼니 세트 — 음식 조합을 이름 붙여 보관한 것("회사 점심 A").
 *
 * ⚠️ 먹은 기록이 **아니다.** 저장해도 섭취 집계에 잡히지 않고, 담을 때 비로소 기록이 만들어진다.
 * 항목 영양값은 수량이 이미 반영된 총량이다(즐겨찾기 음식의 "1회분 기준"과 다르다).
 */
export interface FavoriteMeal {
  id: number
  name: string
  itemCount: number
  totalKcal: number
  carbG: number
  proteinG: number
  fatG: number
  items: FavoriteMealItem[]
}

export interface FavoriteMealItem {
  name: string
  quantity: number
  unit: string
  kcal: number
  carbG: number
  proteinG: number
  fatG: number
}

export interface SaveFavoriteMealRequest {
  name: string
  items: FavoriteMealItem[]
}

export function getFavoriteMeals(): Promise<FavoriteMeal[]> {
  return api('/api/favorite-meals')
}

/** 같은 이름(공백·대소문자 무시)이 이미 있으면 구성을 덮어쓴다 */
export function saveFavoriteMeal(request: SaveFavoriteMealRequest): Promise<FavoriteMeal> {
  return api('/api/favorite-meals', { method: 'POST', body: JSON.stringify(request) })
}

export function deleteFavoriteMeal(id: number): Promise<void> {
  return api(`/api/favorite-meals/${id}`, { method: 'DELETE' })
}
