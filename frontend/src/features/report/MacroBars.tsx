import { useState } from 'react'
import type { ReportBucket } from '../../api/report'

const round = (v: number) => Math.round(v)

/** 일별(버킷) 탄단지 스택 막대 + 탭 툴팁. 각 막대는 버킷의 일 평균 탄단지 */
export function MacroBars({ buckets }: { buckets: ReportBucket[] }) {
  const [active, setActive] = useState<number | null>(null)
  const totals = buckets.map((b) => b.carbG + b.proteinG + b.fatG)
  const max = Math.max(...totals, 1)
  const n = buckets.length
  const labelEvery = n <= 10 ? 1 : Math.ceil(n / 8)

  return (
    <div>
      {/* 범례 */}
      <div className="mb-2 flex justify-end gap-3 text-xs text-muted">
        <Legend tone="bg-carb" label="탄" />
        <Legend tone="bg-protein" label="단" />
        <Legend tone="bg-fat" label="지" />
      </div>

      <div className="relative">
        <div className="flex h-44 items-end gap-1">
          {buckets.map((b, i) => {
            const total = totals[i]
            const h = (total / max) * 100
            return (
              <button
                key={i}
                type="button"
                aria-label={`${b.label} 상세`}
                onClick={() => setActive(active === i ? null : i)}
                className="flex h-full flex-1 flex-col justify-end"
              >
                <div
                  className={`flex w-full flex-col-reverse overflow-hidden rounded-t-md ${
                    active === i ? 'ring-2 ring-ink/20' : ''
                  }`}
                  style={{ height: `${h}%` }}
                >
                  {total > 0 && (
                    <>
                      <div className="w-full bg-carb" style={{ height: `${(b.carbG / total) * 100}%` }} />
                      <div className="w-full bg-protein" style={{ height: `${(b.proteinG / total) * 100}%` }} />
                      <div className="w-full bg-fat" style={{ height: `${(b.fatG / total) * 100}%` }} />
                    </>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* 툴팁 */}
        {active != null && (
          <div
            className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 rounded-xl bg-ink px-3 py-2 text-xs text-white shadow-lg"
            style={{ left: `${((active + 0.5) / n) * 100}%` }}
          >
            <p className="mb-1 font-semibold">{buckets[active].label}</p>
            <p className="text-carb-ink">탄 {round(buckets[active].carbG)}g</p>
            <p className="text-protein-ink">단 {round(buckets[active].proteinG)}g</p>
            <p className="text-fat-ink">지 {round(buckets[active].fatG)}g</p>
          </div>
        )}
      </div>

      {/* x축 라벨 */}
      <div className="mt-1 flex gap-1 text-center text-[11px] text-muted">
        {buckets.map((b, i) => (
          <span key={i} className="flex-1 truncate">
            {i % labelEvery === 0 ? b.label : ''}
          </span>
        ))}
      </div>
    </div>
  )
}

function Legend({ tone, label }: { tone: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`inline-block h-2 w-2 rounded-full ${tone}`} />
      {label}
    </span>
  )
}
