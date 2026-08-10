import { api } from './client'

export type TdeeStatus = 'OK' | 'INSUFFICIENT_DATA'
export type TdeeSource = 'ADAPTIVE' | 'FORMULA'

/** 적응형 유지칼로리 — 실측(ADAPTIVE) 또는 공식(FORMULA) + 추천 목표. maintenance/recommended는 계산 불가 시 null */
export interface TdeeInfo {
  status: TdeeStatus
  maintenanceKcal: number | null
  source: TdeeSource
  currentTargetKcal: number | null
  recommendedTargetKcal: number | null
  windowDays: number
  coverage: number
}

export function getTdee(): Promise<TdeeInfo> {
  return api('/api/tdee')
}
