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
