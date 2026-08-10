import { Link } from 'react-router'
import type { WeightEntry } from '../../api/weight'
import { weightSummary } from './weightSummary'

/** 홈 체중 미니카드 — 최근 체중·7일 변화·스파크라인. 탭하면 체중 탭으로. 기록 없으면 유도 안내.
 *  entries는 logDate 오름차순 가정. */
export function WeightMiniCard({ entries }: { entries: WeightEntry[] }) {
  const summary = weightSummary(entries)

  return (
    <Link
      to="/weight"
      className="flex items-center justify-between rounded-card bg-surface p-4 shadow-sm"
    >
      <div>
        <p className="flex items-center gap-1.5 text-xs font-semibold text-muted">
          <ScaleGlyph />
          최근 체중 추세
        </p>
        {summary ? (
          <div className="mt-0.5 flex items-baseline gap-2">
            <span className="text-xl font-black">
              {summary.latest}
              <span className="ml-0.5 text-xs font-bold text-muted">kg</span>
            </span>
            <DeltaBadge delta={summary.delta} />
          </div>
        ) : (
          <p className="mt-0.5 text-sm text-muted">체중을 기록해 추세를 확인해요</p>
        )}
      </div>
      {summary && <Sparkline entries={entries} />}
    </Link>
  )
}

function DeltaBadge({ delta }: { delta: number }) {
  if (delta === 0) return <span className="text-xs font-bold text-muted">변화 없음</span>
  const down = delta < 0
  return (
    <span className={`rounded-md px-1.5 py-0.5 text-xs font-bold ${down ? 'bg-success-soft text-success' : 'bg-protein-soft text-protein'}`}>
      {down ? '' : '+'}
      {delta}kg
    </span>
  )
}

/** 경량 스파크라인 — 최근 기록들을 선으로. entries.length>=1 가정(호출측에서 보장) */
function Sparkline({ entries }: { entries: WeightEntry[] }) {
  const W = 110
  const H = 40
  const pad = 4
  const values = entries.map((e) => e.weightKg)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const n = values.length
  const x = (i: number) => (n === 1 ? W / 2 : pad + (i / (n - 1)) * (W - 2 * pad))
  const y = (v: number) => H - pad - ((v - min) / span) * (H - 2 * pad)
  const points = values.map((v, i) => `${x(i)},${y(v)}`).join(' ')
  const lastX = x(n - 1)
  const lastY = y(values[n - 1])

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-10 w-28 text-brand" role="img" aria-label="체중 추세 스파크라인">
      {n > 1 && <polyline points={points} fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" />}
      <circle cx={lastX} cy={lastY} r={3.5} className="fill-brand" />
    </svg>
  )
}

function ScaleGlyph() {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M8 9a6 6 0 0 1 8 0l-2.2 2.4a3 3 0 0 0-3.6 0z" />
    </svg>
  )
}
