import { api } from './client'

export type Period = 'WEEK' | 'MONTH' | 'TOTAL'

export interface ReportBucket {
  label: string
  startDate: string
  kcal: number
  carbG: number
  proteinG: number
  fatG: number
}

export interface TdeePoint {
  label: string
  date: string
  maintenanceKcal: number | null
  source: 'ADAPTIVE' | 'FORMULA'
}

export interface ReportInsight {
  code: string
  message: string
}

/** 기간 리포트 — 주간/월간/총. buckets: 주간=요일별·월간=일별·총=월별 스택 막대(일 평균) */
export interface Report {
  period: Period
  rangeStart: string
  rangeEnd: string
  daysLogged: number
  avgKcal: number | null
  targetKcal: number | null
  onTargetDays: number | null
  avgCarbG: number
  avgProteinG: number
  avgFatG: number
  carbPct: number
  proteinPct: number
  fatPct: number
  carbTargetG: number | null
  proteinTargetG: number | null
  fatTargetG: number | null
  buckets: ReportBucket[]
  tdeeSeries: TdeePoint[]
  insights: ReportInsight[]
}

export function getReport(period: Period, anchor?: string): Promise<Report> {
  return api(`/api/reports?period=${period}${anchor ? `&anchor=${anchor}` : ''}`)
}
