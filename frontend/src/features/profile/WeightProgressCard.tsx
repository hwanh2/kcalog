import type { WeightPoint } from '../../api/weight'
import { Card } from '../../ui/form'

/**
 * 체중 진행 — 시작(첫 기록) → 현재 → 목표까지 얼마나 왔는지.
 * 목표 체중이 없거나 기록이 없으면 진행률을 낼 수 없어 안내만 보여준다(없는 수치를 지어내지 않는다).
 */
export function WeightProgressCard({
  points,
  latestKg,
  targetKg,
}: {
  points: WeightPoint[]
  latestKg: number | null
  targetKg: number | null
}) {
  const startKg = points.length > 0 ? points[0].weightKg : null

  if (startKg === null || latestKg === null || targetKg === null) {
    return (
      <Card className="border border-border">
        <p className="text-xs font-medium text-muted">체중 진행</p>
        <p className="mt-2 text-sm text-muted">
          {targetKg === null ? '목표 체중을 정하면 진행률을 보여드려요.' : '체중을 기록하면 진행률을 보여드려요.'}
        </p>
      </Card>
    )
  }

  const total = Math.abs(startKg - targetKg)
  const done = Math.abs(startKg - latestKg)
  // 목표를 지나쳤어도 100%를 넘기지 않는다. 시작=목표면 이미 도달한 것으로 본다
  const percent = total === 0 ? 100 : Math.max(0, Math.min(100, Math.round((done / total) * 100)))
  const remaining = Math.round(Math.abs(latestKg - targetKg) * 10) / 10
  const cutting = targetKg < startKg

  return (
    <Card className="border border-border">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium text-muted">체중 진행</p>
          <p className="mt-0.5 text-base font-black text-ink">목표까지 {percent}%</p>
        </div>
        <span className="rounded-full bg-success-soft px-2.5 py-1 text-[11px] font-bold text-success">
          {startKg}kg → {targetKg}kg
        </span>
      </div>

      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-track">
        <div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${percent}%` }} />
      </div>

      <div className="mt-3 flex items-end justify-between">
        <div className="text-left">
          <p className="text-[11px] font-medium text-muted">시작</p>
          <p className="text-sm font-bold text-muted">{startKg}</p>
        </div>
        <div className="text-center">
          <p className="text-[11px] font-medium text-muted">현재</p>
          <p className="text-2xl font-black text-ink">{latestKg}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-medium text-muted">목표</p>
          <p className="text-sm font-bold text-success">{targetKg}</p>
        </div>
      </div>

      <p className="mt-2 text-xs font-semibold text-muted">
        {remaining === 0
          ? '목표에 도달했어요'
          : `남은 ${cutting ? '감량' : '증량'} ${remaining}kg`}
      </p>
    </Card>
  )
}
