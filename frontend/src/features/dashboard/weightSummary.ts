import type { WeightEntry } from '../../api/weight'
import { addDays } from '../../lib/date'

export interface WeightSummary {
  latest: number
  /** 약 7일 전(없으면 창 내 최초) 대비 변화량. 기록이 1개뿐이면 0 */
  delta: number
}

/** 체중 미니카드용 요약 — entries는 logDate 오름차순 가정. 비어 있으면 null.
 *  기준선: 최신일로부터 7일 이전(포함) 중 가장 최근 기록, 없으면 창 내 최초 기록. */
export function weightSummary(entries: WeightEntry[]): WeightSummary | null {
  if (entries.length === 0) return null
  const latest = entries[entries.length - 1]
  const cutoff = addDays(latest.logDate, -7)
  const baseline =
    [...entries].reverse().find((e) => e.logDate <= cutoff) ?? entries[0]
  return {
    latest: latest.weightKg,
    delta: Math.round((latest.weightKg - baseline.weightKg) * 10) / 10,
  }
}
