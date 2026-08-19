import { useState } from 'react'
import { MacroGuideSheet } from './MacroGuideSheet'
import { InfoIcon } from '../../ui/icons'
import { ProgressBar } from '../../ui/ProgressBar'

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
  const [guideOpen, setGuideOpen] = useState(false)
  const rows: Row[] = [
    { label: '탄수화물', intake: carbG, target: carbTargetG, barClass: 'bg-carb' },
    { label: '단백질', intake: proteinG, target: proteinTargetG, barClass: 'bg-protein' },
    { label: '지방', intake: fatG, target: fatTargetG, barClass: 'bg-fat' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-extrabold">오늘의 탄·단·지 달성도</h2>
        {/*
          목표를 매일 마주하는 자리다. "탄수가 왜 이렇게 많지", "고기를 이만큼 먹어야 하나"가
          생기는 곳도 여기다. 문구를 상시로 깔면 잔소리가 되므로 (i)로만 둔다 (design D9).
        */}
        <button
          type="button"
          aria-label="탄단지 목표 안내 열기"
          onClick={() => setGuideOpen(true)}
          className="-my-2 -mr-2 flex h-11 w-11 items-center justify-center rounded-full text-muted touch-manipulation focus-visible:ring-2 focus-visible:ring-brand-ink"
        >
          <InfoIcon />
        </button>
      </div>
      {rows.map((row) => (
        <MacroRow key={row.label} {...row} />
      ))}
      {guideOpen && <MacroGuideSheet onClose={() => setGuideOpen(false)} />}
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
      {/* 목표가 없으면 `pct`가 0이라 빈 트랙이 된다 — 트랙을 손으로 한 벌 더 그리면
          치수·라운드·배경이 ProgressBar와 갈라진다 */}
      <ProgressBar value={pct} barClass={barClass} />
    </div>
  )
}
