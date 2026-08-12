/** 남은 칼로리 도넛 링 — 섭취/목표 비율만큼 원호를 채우고 가운데에 남은 칼로리를 표시.
 *  목표 미설정(target=null)이면 링 없이 섭취량만, 초과면 위험 색·"목표 초과". 인라인 SVG(라이브러리 없음).
 *  path는 둘레가 100이 되도록 그려 stroke-dasharray를 퍼센트로 바로 쓴다. */
export function CalorieRing({
  totalKcal,
  dailyKcalTarget,
  remainingKcal,
}: {
  totalKcal: number
  dailyKcalTarget: number | null
  remainingKcal: number | null
}) {
  const hasTarget = dailyKcalTarget !== null && remainingKcal !== null
  const over = hasTarget && remainingKcal < 0
  const pct = hasTarget ? Math.min(100, Math.max(0, (totalKcal / dailyKcalTarget) * 100)) : 0
  // 링 호는 글씨가 아니라 면 — 밝은 brand를 그대로 쓴다(가운데 숫자만 글씨용 ink)
  const arcClass = over ? 'text-danger' : 'text-brand'

  return (
    <div>
      <div className="flex justify-center">
        <div className="relative flex h-36 w-36 items-center justify-center">
          <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90" role="img" aria-label="칼로리 링">
            <path
              className="text-canvas"
              fill="none"
              stroke="currentColor"
              strokeWidth={3.5}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            {hasTarget && (
              <path
                className={arcClass}
                fill="none"
                stroke="currentColor"
                strokeWidth={3.8}
                strokeLinecap="round"
                strokeDasharray={`${pct}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            )}
          </svg>
          <div className="absolute text-center">
            {hasTarget ? (
              <>
                <span className="block text-[11px] font-bold text-muted">
                  {over ? '목표 초과' : '남은 칼로리'}
                </span>
                <span className={`text-3xl font-black leading-none ${over ? 'text-danger' : 'text-brand-ink'}`}>
                  {Math.abs(remainingKcal)}
                </span>
                <span className="mt-1 block text-[11px] font-semibold text-muted">
                  {totalKcal.toLocaleString()} / {dailyKcalTarget.toLocaleString()} kcal
                </span>
              </>
            ) : (
              <>
                <span className="block text-[11px] font-bold text-muted">오늘 섭취</span>
                <span className="text-3xl font-black leading-none text-brand-ink">{totalKcal}</span>
                <span className="mt-1 block text-[11px] font-semibold text-muted">kcal</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 divide-x divide-border text-center">
        <Stat label="섭취" value={totalKcal.toLocaleString()} />
        <Stat label="남은" value={hasTarget ? remainingKcal.toLocaleString() : '–'} />
        <Stat label="목표" value={hasTarget ? dailyKcalTarget.toLocaleString() : '–'} />
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 text-lg font-black text-ink">{value}</p>
    </div>
  )
}
