import type { WeightEntry } from '../../api/weight'

/** 체중 추이 — 경량 인라인 SVG 라인 차트(의존성 없음). weights는 logDate 오름차순 가정 */
export function WeightTrend({ weights }: { weights: WeightEntry[] }) {
  if (weights.length === 0) {
    return <p className="mt-3 text-sm text-muted">최근 체중 기록이 없어요.</p>
  }

  const W = 300
  const H = 120
  const pad = 24
  const values = weights.map((w) => w.weightKg)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1 // 한 값뿐이면 0으로 나눔 방지
  const n = weights.length
  const x = (i: number) => (n === 1 ? W / 2 : pad + (i / (n - 1)) * (W - 2 * pad))
  const y = (v: number) => H - pad - ((v - min) / span) * (H - 2 * pad)
  const points = weights.map((w, i) => `${x(i)},${y(w.weightKg)}`).join(' ')
  const latest = values[values.length - 1]

  return (
    <div className="mt-4">
      <div className="flex justify-between text-sm">
        <span className="text-muted">최근 체중 추이</span>
        <span className="font-medium text-brand">{latest} kg</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 w-full" role="img" aria-label="체중 추이 그래프">
        {n > 1 && (
          <polyline points={points} fill="none" stroke="currentColor" strokeWidth={2} className="text-brand" />
        )}
        {weights.map((w, i) => (
          <circle key={w.logDate} cx={x(i)} cy={y(w.weightKg)} r={3} className="fill-brand" />
        ))}
        <text x={pad} y={12} className="fill-muted text-[10px]">
          {max}
        </text>
        <text x={pad} y={H - 6} className="fill-muted text-[10px]">
          {min}
        </text>
      </svg>
    </div>
  )
}
