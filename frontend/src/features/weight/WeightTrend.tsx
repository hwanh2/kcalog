import type { WeightPoint } from '../../api/weight'
import { koreanWeekday } from './estimator'
import { trendScale } from './trendScale'

/** 체중 추세선 — 원시 점(옅게) + EMA 추세선(진하게) + 축 라벨·범례. 경량 인라인 SVG. points 오름차순 가정 */
export function WeightTrend({ points }: { points: WeightPoint[] }) {
  if (points.length === 0) {
    return <p className="mt-3 text-sm text-muted">최근 체중 기록이 없어요.</p>
  }

  const W = 320
  const H = 150
  const pad = 20
  const values = points.flatMap((p) => [p.weightKg, p.trendKg])
  const n = points.length
  const { x, y } = trendScale({ values, width: W, height: H, padX: pad, padY: pad })
  const trendLine = points.map((p, i) => `${x(i)},${y(p.trendKg)}`).join(' ')
  const latest = points[n - 1]

  // x축 라벨 — 처음/중간/오늘 (겹침 방지로 최대 3개)
  const mid = Math.floor((n - 1) / 2)
  const ticks = n <= 1 ? [0] : [...new Set([0, mid, n - 1])]

  return (
    <div className="mt-4">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="체중 추이 그래프">
        {/* 기준선(옅게) */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={pad}
            x2={W - pad}
            y1={pad + f * (H - 2 * pad)}
            y2={pad + f * (H - 2 * pad)}
            className="stroke-border"
            strokeDasharray="3 4"
            strokeWidth={1}
          />
        ))}
        {/* 추세선은 글씨가 아니라 면 — 밝은 brand를 그대로 쓴다(굵기로 읽히지, 대비로 읽히지 않는다) */}
        {n > 1 && (
          <polyline points={trendLine} fill="none" stroke="currentColor" strokeWidth={2.5} className="text-brand" />
        )}
        {points.map((p, i) => (
          <circle key={p.logDate} cx={x(i)} cy={y(p.weightKg)} r={3} className="fill-muted" opacity={0.5} />
        ))}
        {/* 최신 점 강조 */}
        <circle cx={x(n - 1)} cy={y(latest.trendKg)} r={4} className="fill-brand" />
      </svg>

      {/* x축 라벨 */}
      <div className="mt-1 flex justify-between px-1 text-[11px] text-muted">
        {ticks.map((i, idx) => (
          <span key={i}>
            {idx === ticks.length - 1 ? `오늘 (${latest.weightKg}kg)` : shortDate(points[i].logDate)}
          </span>
        ))}
      </div>

      {/* 범례 */}
      <div className="mt-2 flex gap-4 text-xs text-muted">
        <span className="flex items-center gap-1">
          <span className="inline-block h-1 w-4 rounded-full bg-brand" /> 이동평균 추세
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-muted opacity-50" /> 일별 실측치
        </span>
      </div>
    </div>
  )
}

/** YYYY-MM-DD → "M/D (요일)" */
function shortDate(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${Number(m)}/${Number(d)} (${koreanWeekday(iso)})`
}
