import { api } from './client'
import type { MealType } from './meal'

export interface TimelineEntry {
  id: number
  eatenAt: string
  mealType: MealType
  totalKcal: number
}

export interface Dashboard {
  totalKcal: number
  carbG: number
  proteinG: number
  fatG: number
  dailyKcalTarget: number | null
  remainingKcal: number | null // 목표 - 총섭취 (초과 시 음수), 목표 미설정 시 null
  // 탄단지 목표(g) — 칼로리 목표에서 50/30/20 파생. 목표 미설정 시 null (design D3)
  carbTargetG: number | null
  proteinTargetG: number | null
  fatTargetG: number | null
  timeline: TimelineEntry[]
}

export function getDashboard(date: string): Promise<Dashboard> {
  return api(`/api/dashboard?date=${date}`)
}
