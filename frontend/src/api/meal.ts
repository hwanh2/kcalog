import { API_BASE, ApiError, api, getAccessToken, refreshAccessToken } from './client'

export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'
export type MealSource = 'AI' | 'MANUAL'

/** 이미지 정규화 좌표(0~1) — 오버레이 렌더링 전용, 저장하지 않는다 */
export interface BoundingBox {
  x: number
  y: number
  w: number
  h: number
}

/** 분석이 돌려준 음식 한 항목 — box는 오버레이용(미저장) */
export interface AnalyzedItem {
  name: string
  kcal: number
  carbG: number
  proteinG: number
  fatG: number
  box: BoundingBox
}

export interface MealAnalysis {
  foodFound: boolean
  items: AnalyzedItem[]
  overallConfidence: number
  notes: string
}

/** 저장·수정 요청의 음식 항목 (box 없음 — 서버에 위치는 보내지 않는다) */
export interface MealItemInput {
  name: string
  kcal: number
  carbG: number
  proteinG: number
  fatG: number
}

export interface SaveMealRequest {
  eatenAt: string // ISO instant
  mealType: MealType
  source: MealSource
  items: MealItemInput[]
}

/** 저장된 음식 항목 (조회 응답) */
export interface MealItem {
  name: string
  kcal: number
  carbG: number
  proteinG: number
  fatG: number
}

export interface Meal {
  id: number
  eatenAt: string
  mealType: MealType
  source: MealSource
  totalKcal: number // 서버가 items 합으로 계산한 비정규화 합계
  carbG: number
  proteinG: number
  fatG: number
  items: MealItem[]
}

/** 부분 수정 — 값이 있으면 교체, 없으면 유지. items는 전체 교체(빈 배열 금지) */
export interface UpdateMealRequest {
  mealType?: MealType
  eatenAt?: string
  items?: MealItemInput[]
}

/**
 * 사진 분석 — 멀티파트 업로드. api()는 JSON 재시도 로직이 FormData를 재사용 못하므로
 * 여기서 직접 401→refresh→재시도를 한 번 수행한다 (FormData는 매 시도마다 새로 만들 필요 없음, 동일 참조 재전송 가능).
 */
export async function analyzeMeal(image: Blob): Promise<MealAnalysis> {
  const send = () => {
    const form = new FormData()
    form.append('image', image, 'meal.jpg')
    const headers = new Headers()
    const token = getAccessToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
    return fetch(`${API_BASE}/api/meals/analyze`, { method: 'POST', body: form, headers })
  }

  let res = await send()
  if (res.status === 401) {
    const token = await refreshAccessToken()
    if (!token) {
      window.location.assign('/login')
      throw new ApiError(401, null)
    }
    res = await send()
  }
  if (!res.ok) {
    throw new ApiError(res.status, await res.json().catch(() => null))
  }
  return (await res.json()) as MealAnalysis
}

export function saveMeal(request: SaveMealRequest): Promise<Meal> {
  return api('/api/meals', { method: 'POST', body: JSON.stringify(request) })
}

export function getMeals(date: string): Promise<Meal[]> {
  return api(`/api/meals?date=${date}`)
}

export function updateMeal(id: number, request: UpdateMealRequest): Promise<Meal> {
  return api(`/api/meals/${id}`, { method: 'PATCH', body: JSON.stringify(request) })
}

export function deleteMeal(id: number): Promise<void> {
  return api(`/api/meals/${id}`, { method: 'DELETE' })
}
