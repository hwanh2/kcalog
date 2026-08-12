import type { Report } from '../../api/report'
import type { WeightPoint } from '../../api/weight'
import { Card } from '../../ui/form'

/**
 * 주간 요약 — 최근 3주의 평균 섭취와 체중 변화.
 * 체중 변화는 그 주 안의 추세값(trendKg) 처음·끝 차이로 낸다(하루치 널뛰기를 덜 타도록).
 * 기록이 없는 주는 값을 비워 둔다.
 */
export function WeeklySummaryCard({ reports, points }: { reports: Report[]; points: WeightPoint[] }) {
  if (reports.length === 0) {
    return null
  }

  return (
    <Card className="border border-border">
      <p className="text-xs font-medium text-muted">주간 요약</p>
      <ul className="mt-2 divide-y divide-border">
        {reports.map((report, index) => {
          const delta = weightDelta(points, report.rangeStart, report.rangeEnd)
          return (
            <li key={report.rangeStart} className="flex items-center gap-2 py-2.5">
              <span className="w-7 shrink-0 text-[11px] font-bold text-muted">W{reports.length - index}</span>
              <span className="flex-1 text-xs font-medium text-ink">
                {shortDate(report.rangeStart)}–{shortDate(report.rangeEnd)}
              </span>
              <span className="text-xs font-bold text-ink">
                {report.avgKcal === null ? '-' : `${report.avgKcal.toLocaleString()} kcal`}
              </span>
              <span
                className={`w-14 text-right text-xs font-bold ${
                  delta === null ? 'text-muted' : delta < 0 ? 'text-success' : 'text-ink'
                }`}
              >
                {delta === null ? '-' : `${delta > 0 ? '+' : ''}${delta}kg`}
              </span>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

/** 그 주 안의 추세값 변화 — 양 끝 기록이 없으면 null */
function weightDelta(points: WeightPoint[], from: string, to: string): number | null {
  const inRange = points.filter((point) => point.logDate >= from && point.logDate <= to)
  if (inRange.length < 2) return null
  const change = inRange[inRange.length - 1].trendKg - inRange[0].trendKg
  return Math.round(change * 10) / 10
}

/** 2026-08-04 → 8/04 */
function shortDate(date: string): string {
  const [, month, day] = date.split('-')
  return `${Number(month)}/${day}`
}
