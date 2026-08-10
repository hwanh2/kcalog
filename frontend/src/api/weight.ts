import { api } from './client'

export interface WeightEntry {
  logDate: string // YYYY-MM-DD
  weightKg: number
}

/** 체중 기록(upsert) — logDate 생략 시 서버가 오늘로 기록 */
export function recordWeight(request: { weightKg: number; logDate?: string }): Promise<WeightEntry> {
  return api('/api/weights', { method: 'POST', body: JSON.stringify(request) })
}

/** 기간 조회 — logDate 오름차순 */
export function getWeights(from: string, to: string): Promise<WeightEntry[]> {
  return api(`/api/weights?from=${from}&to=${to}`)
}

/** 하루 점 — 원시 체중 + EMA 추세값 */
export interface WeightPoint {
  logDate: string
  weightKg: number
  trendKg: number
}

export type BmiCategory = 'UNDERWEIGHT' | 'NORMAL' | 'OVERWEIGHT' | 'OBESE'

export interface BmiInfo {
  value: number
  category: BmiCategory
}

export type ProjectionStatus = 'ON_TRACK' | 'INSUFFICIENT_DATA' | 'NOT_APPROACHING' | 'NO_GOAL'

export interface ProjectionInfo {
  status: ProjectionStatus
  targetKg: number | null
  projectedDate: string | null
  weeks: number | null
  weeklyRateKg: number | null
}

/** 체중 탭 요약 — 추세선·최신값·BMI·연속 기록·목표 예상 */
export interface WeightSummary {
  points: WeightPoint[]
  latestKg: number | null
  latestTrendKg: number | null
  bmi: BmiInfo | null
  streakDays: number
  projection: ProjectionInfo
}

/** 요약 조회 — 추세는 이전 히스토리로 seed되어 내려온다 */
export function getWeightSummary(from: string, to: string): Promise<WeightSummary> {
  return api(`/api/weights/summary?from=${from}&to=${to}`)
}
