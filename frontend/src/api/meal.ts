import { api } from './client'

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
  analysisJobId?: number // AI 저장 시 분석 작업의 사진을 연결 (수동 입력은 생략)
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
  imageUrl: string | null // 연결된 사진 프록시 경로(없으면 null) — AuthImage로 로드
  items: MealItem[]
}

/** 부분 수정 — 값이 있으면 교체, 없으면 유지. items는 전체 교체(빈 배열 금지) */
export interface UpdateMealRequest {
  mealType?: MealType
  eatenAt?: string
  items?: MealItemInput[]
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
