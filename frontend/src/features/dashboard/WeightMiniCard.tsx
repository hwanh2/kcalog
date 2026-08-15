import { Link } from 'react-router'
import type { WeightEntry } from '../../api/weight'
import { trendScale } from '../weight/trendScale'
import { weightSummary } from './weightSummary'

/** 미니 차트에 그릴 최근 기록 수 — 7일 변화량과 눈금을 맞춘다 */
const CHART_POINTS = 7

/** 홈 체중 추세 카드 — 최근 체중·7일 변화·목표까지 남은 양 + 추세 그래프. 탭하면 체중 탭으로.
 *  entries는 logDate 오름차순 가정. 기록이 없으면 유도 안내만 보여준다. */
export function WeightMiniCard({
  entries,
  targetWeightKg,
}: {
  entries: WeightEntry[]
  targetWeightKg?: number | null
}) {
  const summary = weightSummary(entries)

  if (!summary) {
    return (
      <Link to="/app/weight" className="block rounded-card bg-surface p-4 shadow-sm">
        <p className="text-sm font-bold text-ink">체중 추세</p>
        <p className="mt-1 text-sm text-muted">체중을 기록해 추세를 확인해요</p>
      </Link>
    )
  }

  const toGoal =
    targetWeightKg != null ? Math.round(Math.abs(summary.latest - targetWeightKg) * 10) / 10 : null

  return (
    <Link to="/app/weight" className="block rounded-card bg-surface p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink">체중 추세</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-3xl font-black text-ink">{summary.latest}</span>
            <DeltaText delta={summary.delta} />
          </div>
        </div>
        {toGoal !== null && (
          <span className="shrink-0 rounded-full bg-success-soft px-3 py-1.5 text-xs font-bold text-success">
            {toGoal === 0 ? '목표 달성' : `목표까지 ${toGoal}kg`}
          </span>
        )}
      </div>

      <TrendChart entries={entries.slice(-CHART_POINTS)} />
    </Link>
  )
}

function DeltaText({ delta }: { delta: number }) {
  if (delta === 0) return <span className="text-sm font-bold text-muted">변화 없음 (7일)</span>
  const down = delta < 0
  return (
    <span className={`text-sm font-bold ${down ? 'text-success' : 'text-protein-ink'}`}>
      {down ? '−' : '+'}
      {Math.abs(delta)}kg (7일)
    </span>
  )
}

/**
 * 추세 그래프 — 선 + 각 기록점 동그라미 + 아래쪽 옅은 면. 인라인 SVG(라이브러리 없음).
 * 값 폭이 좁아도 선이 납작해지지 않도록 최소 폭(MIN_SPAN_KG)을 준다.
 */
function TrendChart({ entries }: { entries: WeightEntry[] }) {
  const W = 320
  const H = 84
  const padX = 8
  const padY = 14
  const MIN_SPAN_KG = 1

  const values = entries.map((e) => e.weightKg)
  const n = values.length
  const { x, y } = trendScale({ values, count: n, width: W, height: H, padX, padY, minSpan: MIN_SPAN_KG })

  const line = values.map((v, i) => `${x(i)},${y(v)}`).join(' ')
  const area = `${padX},${H} ${line} ${x(n - 1)},${H}`

  // 스파크라인은 글씨가 아니라 면 — 밝은 brand를 그대로 쓴다
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="mt-2 h-20 w-full text-brand"
      role="img"
      aria-label="체중 추세 그래프"
    >
      <defs>
        <linearGradient id="weightTrendFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>

      {n > 1 && <polygon points={area} fill="url(#weightTrendFill)" />}
      {n > 1 && (
        <polyline
          points={line}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {values.map((v, i) => (
        <circle
          key={i}
          cx={x(i)}
          cy={y(v)}
          r={4}
          fill="var(--color-surface)"
          stroke="currentColor"
          strokeWidth={2}
        />
      ))}
    </svg>
  )
}
