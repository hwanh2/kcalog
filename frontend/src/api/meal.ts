import { API_BASE, ApiError, api, getAccessToken, refreshAccessToken } from './client'

export type MealType = 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK'
export type MealSource = 'AI' | 'MANUAL'

export interface MealAnalysis {
  foodFound: boolean
  totalKcal: number
  carbG: number
  proteinG: number
  fatG: number
  confidence: number
  notes: string
}

export interface SaveMealRequest {
  eatenAt: string // ISO instant
  mealType: MealType
  source: MealSource
  totalKcal: number
  carbG: number
  proteinG: number
  fatG: number
}

export interface Meal {
  id: number
  eatenAt: string
  mealType: MealType
  source: MealSource
  totalKcal: number
  carbG: number
  proteinG: number
  fatG: number
}

export type UpdateMealRequest = Partial<Pick<Meal, 'eatenAt' | 'mealType' | 'totalKcal' | 'carbG' | 'proteinG' | 'fatG'>>

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
