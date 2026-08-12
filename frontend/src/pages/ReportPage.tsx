import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getReport } from '../api/report'
import type { Period, Report, TdeePoint } from '../api/report'
import { Card } from '../ui/form'
import { MacroBars } from '../features/report/MacroBars'

const PERIODS: { key: Period; label: string }[] = [
  { key: 'WEEK', label: '주간' },
  { key: 'MONTH', label: '월간' },
  { key: 'TOTAL', label: '총' },
]

export function ReportPage() {
  const [period, setPeriod] = useState<Period>('WEEK')
  const { data: report } = useQuery({
    queryKey: ['report', period],
    queryFn: () => getReport(period),
  })

  return (
    <section>
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">리포트</h1>
        <div className="flex rounded-full bg-canvas p-0.5 text-sm" role="tablist" aria-label="기간">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              role="tab"
              aria-selected={period === p.key}
              onClick={() => setPeriod(p.key)}
              className={`rounded-full px-3 py-1 ${
                period === p.key ? 'bg-surface font-medium text-ink shadow-sm' : 'text-muted'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {report && report.daysLogged === 0 && (
        <Card className="mt-4">
          <p className="text-sm text-muted">이 기간에 기록이 없어요. 식사를 기록하면 리포트를 볼 수 있어요.</p>
        </Card>
      )}

      {report && report.daysLogged > 0 && (
        <>
          <Achievement report={report} />
          <MacroDistribution report={report} />
          <TdeeTrend series={report.tdeeSeries} />
          <Insights report={report} />
        </>
      )}
    </section>
  )
}

function Achievement({ report }: { report: Report }) {
  return (
    <Card className="mt-4">
      <p className="font-semibold text-ink">목표 달성</p>
      <div className="mt-2 flex items-end gap-4">
        <div>
          <p className="text-2xl font-bold text-ink">
            {report.onTargetDays != null ? report.onTargetDays : '–'}
            <span className="text-base font-normal text-muted"> / {report.daysLogged}일</span>
          </p>
          <p className="text-xs text-muted">목표 달성 / 기록</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-lg font-semibold text-ink">{report.avgKcal?.toLocaleString()} kcal</p>
          <p className="text-xs text-muted">
            일 평균{report.targetKcal ? ` · 목표 ${report.targetKcal.toLocaleString()}` : ''}
          </p>
        </div>
      </div>
    </Card>
  )
}

function MacroDistribution({ report }: { report: Report }) {
  return (
    <Card className="mt-4">
      <p className="text-xs text-muted">기간 탄단지</p>
      <p className="font-semibold text-ink">일별 분포</p>
      <div className="mt-3">
        <MacroBars buckets={report.buckets} />
      </div>
      <p className="mt-3 text-xs text-muted">
        일 평균 · 탄 {Math.round(report.avgCarbG)}g ({report.carbPct}%) · 단 {Math.round(report.avgProteinG)}g (
        {report.proteinPct}%) · 지 {Math.round(report.avgFatG)}g ({report.fatPct}%)
      </p>
    </Card>
  )
}

function TdeeTrend({ series }: { series: TdeePoint[] }) {
  const points = series.filter((p): p is TdeePoint & { maintenanceKcal: number } => p.maintenanceKcal != null)
  if (points.length < 2) {
    return (
      <Card className="mt-4">
        <p className="font-semibold text-ink">유지칼로리 변화</p>
        <p className="mt-1 text-sm text-muted">데이터가 더 쌓이면 유지칼로리 변화를 보여드려요.</p>
      </Card>
    )
  }
  const W = 300
  const H = 80
  const pad = 8
  const vals = points.map((p) => p.maintenanceKcal)
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const span = max - min || 1
  const x = (i: number) => pad + (i / (points.length - 1)) * (W - 2 * pad)
  const y = (v: number) => H - pad - ((v - min) / span) * (H - 2 * pad)
  const line = points.map((p, i) => `${x(i)},${y(p.maintenanceKcal)}`).join(' ')
  const latest = points[points.length - 1].maintenanceKcal

  return (
    <Card className="mt-4">
      <div className="flex items-center justify-between">
        <p className="font-semibold text-ink">유지칼로리 변화</p>
        <span className="text-sm font-medium text-brand">{latest.toLocaleString()} kcal</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-2 w-full" role="img" aria-label="유지칼로리 변화 그래프">
        {/* 추세선은 면 — 밝은 brand 유지 */}
        <polyline points={line} fill="none" stroke="currentColor" strokeWidth={2} className="text-brand" />
      </svg>
    </Card>
  )
}

function Insights({ report }: { report: Report }) {
  return (
    <Card className="mt-4">
      <p className="font-semibold text-ink">인사이트</p>
      {report.insights.length === 0 ? (
        <p className="mt-1 text-sm text-muted">데이터가 더 쌓이면 인사이트를 보여드려요.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {report.insights.map((it) => (
            <li key={it.code} className="flex gap-2 text-sm text-ink">
              <span>💡</span>
              <span>{it.message}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
