/** 탄단지 달성도 — 매크로별 섭취 g / 목표 g·달성률·진행 바.
 *  목표(target)가 있으면 g/목표 g (%)와 채워진 바, 없으면 섭취 g만 표시. 색: 탄 앰버·단 로즈·지 시안. */
type Row = { label: string; intake: number; target: number | null; barClass: string }

export function MacroProgress({
  carbG,
  proteinG,
  fatG,
  carbTargetG,
  proteinTargetG,
  fatTargetG,
}: {
  carbG: number
  proteinG: number
  fatG: number
  carbTargetG: number | null
  proteinTargetG: number | null
  fatTargetG: number | null
}) {
  const rows: Row[] = [
    { label: '탄수화물', intake: carbG, target: carbTargetG, barClass: 'bg-carb' },
    { label: '단백질', intake: proteinG, target: proteinTargetG, barClass: 'bg-protein' },
    { label: '지방', intake: fatG, target: fatTargetG, barClass: 'bg-fat' },
  ]

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-extrabold">오늘의 탄·단·지 달성도</h2>
      {rows.map((row) => (
        <MacroRow key={row.label} {...row} />
      ))}
    </div>
  )
}

function MacroRow({ label, intake, target, barClass }: Row) {
  const pct = target && target > 0 ? Math.min(100, Math.round((intake / target) * 100)) : 0
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-bold">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${barClass}`} />
          {label}
        </span>
        <span className="font-black">
          {intake}g
          {target !== null && (
            <span className="font-normal text-muted">
              {' '}
              / {target}g ({pct}%)
            </span>
          )}
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-canvas">
        {target !== null && <div className={`h-full rounded-full ${barClass}`} style={{ width: `${pct}%` }} />}
      </div>
    </div>
  )
}
