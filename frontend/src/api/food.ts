import { api } from './client'

/** 카탈로그(공통) / 즐겨찾기(내가 저장) — 화면이 ★로 구분해 보여준다 */
export type FoodSource = 'CATALOG' | 'FAVORITE'

/**
 * 담을 수 있는 음식 한 항목. 영양값은 quantity·unit 기준 1회분이며,
 * 담을 때 선택 수량에 비례해 계산한다.
 * emoji는 직접 만든 즐겨찾기에서 null일 수 있다(화면이 이름 첫 글자 배지로 대체).
 */
export interface Food {
  id: number
  source: FoodSource
  name: string
  emoji: string | null
  aliases: string[]
  quantity: number
  unit: string
  kcal: number
  carbG: number
  proteinG: number
  fatG: number
}

export interface SaveFavoriteRequest {
  name: string
  emoji?: string | null
  quantity: number
  unit: string
  kcal: number
  carbG: number
  proteinG: number
  fatG: number
  /** 켜면 개인 보정치로도 저장해 이후 AI 분석에 반영된다(기본 false) */
  rememberForAnalysis?: boolean
}

/** 카탈로그 + 내 즐겨찾기 통합 목록 — 즐겨찾기가 앞(최근 갱신 순), 카탈로그가 뒤(정렬 순) */
export function getFoods(): Promise<Food[]> {
  return api('/api/foods')
}

export function getFavorites(): Promise<Food[]> {
  return api('/api/favorites')
}

export function saveFavorite(request: SaveFavoriteRequest): Promise<Food> {
  return api('/api/favorites', { method: 'POST', body: JSON.stringify(request) })
}

export function deleteFavorite(id: number): Promise<void> {
  return api(`/api/favorites/${id}`, { method: 'DELETE' })
}
