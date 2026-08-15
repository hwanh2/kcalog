import { useId } from 'react'
import type { WeightPoint } from '../../api/weight'
import { koreanWeekday } from '../../lib/date'
import { trendScale } from './trendScale'

/** 체중 추세선 — 원시 점(옅게) + EMA 추세선(진하게) + 축 라벨·범례. 경량 인라인 SVG. points 오름차순 가정 */
export function WeightTrend({ points }: { points: WeightPoint[] }) {
  // 같은 문서에 그래프가 둘 이상 놓여도 서로의 clipPath를 물지 않게 한다
  const revealId = useId()

  if (points.length === 0) {
    return <p className="mt-3 text-sm text-muted">최근 체중 기록이 없어요.</p>
  }

  const W = 320
  const H = 150
  const pad = 20
  const values = points.flatMap((p) => [p.weightKg, p.trendKg])
  const n = points.length
  // count는 점 개수 — values는 점마다 실측·추세 둘을 담으므로 길이가 2배다
  const { x, y } = trendScale({ values, count: n, width: W, height: H, padX: pad, padY: pad })
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
        {/*
          기준선은 도판의 틀이라 처음부터 그대로 있고, **데이터만** 왼쪽에서 오른쪽으로 드러난다.
          과거에서 오늘로 흐르는 방향이라 마지막에 나타나는 것이 오늘 점이다.

          `key`에 좌표를 넣어 범위를 바꾸면(1주 → 1개월) 다시 그려지게 한다 — 같은 요소를 두면
          클래스가 그대로라 CSS 애니메이션이 다시 돌지 않는다.
        */}
        <defs>
          <clipPath id={revealId}>
            <rect key={trendLine} className="animate-sweep-x" x="0" y="0" width={W} height={H} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${revealId})`}>
          {/* 추세선은 글씨가 아니라 면 — 밝은 brand를 그대로 쓴다(굵기로 읽히지, 대비로 읽히지 않는다) */}
          {n > 1 && (
            <polyline points={trendLine} fill="none" stroke="currentColor" strokeWidth={2.5} className="text-brand" />
          )}
          {points.map((p, i) => (
            <circle key={p.logDate} cx={x(i)} cy={y(p.weightKg)} r={3} className="fill-muted" opacity={0.5} />
          ))}
          {/* 최신 점 강조 */}
          <circle cx={x(n - 1)} cy={y(latest.trendKg)} r={4} className="fill-brand" />
        </g>
      </svg>

      {/*
        x축 라벨 — 점이 찍힌 자리 바로 아래에 놓는다. `justify-between`으로 양끝에 붙이면
        점은 좌우 여백(pad) 안쪽에 있는데 라벨만 끝까지 나가 서로 어긋난다.

        left와 translateX에 **같은 비율**을 쓰면 왼쪽 끝(0%)에서는 왼쪽 정렬, 가운데(50%)에서는
        가운데 정렬, 오른쪽 끝(100%)에서는 오른쪽 정렬이 되어 라벨이 저절로 도판 안에 머문다.
      */}
      <div className="relative mt-1 h-4 text-[11px] text-muted">
        {ticks.map((i, idx) => {
          const pct = (x(i) / W) * 100
          return (
            <span
              key={i}
              className="absolute whitespace-nowrap"
              style={{ left: `${pct}%`, transform: `translateX(-${pct}%)` }}
            >
              {idx === ticks.length - 1 ? `오늘 (${latest.weightKg}kg)` : shortDate(points[i].logDate)}
            </span>
          )
        })}
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
