import type { WeightPoint } from '../../api/weight'

export type TrendRange = '1주' | '1월' | '3월'

const RANGE_DAYS: Record<TrendRange, number> = { '1주': 7, '1월': 30, '3월': 90 }

/** 차트 표시 범위로 점을 자른다 — 마지막 점 날짜 기준 최근 N일. 예상·시작값은 전체 요약을 쓰므로 여기서 자르지 않는다 */
export function sliceByRange(points: WeightPoint[], range: TrendRange): WeightPoint[] {
  if (points.length === 0) return points
  const lastDate = new Date(`${points[points.length - 1].logDate}T12:00:00Z`)
  const cutoff = new Date(lastDate)
  cutoff.setUTCDate(cutoff.getUTCDate() - (RANGE_DAYS[range] - 1))
  const cutoffStr = cutoff.toISOString().slice(0, 10)
  return points.filter((p) => p.logDate >= cutoffStr)
}

/** 직전 기록 대비 변화(kg) — 최신값 − 바로 이전 기록("어제보다"). 점이 1개뿐이면 null */
export function prevDelta(points: WeightPoint[]): number | null {
  if (points.length < 2) return null
  const latest = points[points.length - 1].weightKg
  const prev = points[points.length - 2].weightKg
  return Math.round((latest - prev) * 10) / 10
}

/** 진행률 0~1 — 시작에서 목표까지 중 현재 위치. 감량·증량 모두 처리 */
export function progressFraction(startKg: number, currentKg: number, targetKg: number): number {
  const denom = targetKg - startKg
  if (denom === 0) return 1
  const f = (currentKg - startKg) / denom
  return Math.min(1, Math.max(0, f))
}

/** fromISO→toISO 남은 일수(날짜 기준, 시간대 무관) */
export function daysUntil(fromISO: string, toISO: string): number {
  const a = new Date(`${fromISO}T00:00:00Z`).getTime()
  const b = new Date(`${toISO}T00:00:00Z`).getTime()
  return Math.round((b - a) / 86_400_000)
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

/** YYYY-MM-DD → "M월 D일 (요일)" */
export function formatKoreanDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
  return `${m}월 ${d}일 (${weekday})`
}
