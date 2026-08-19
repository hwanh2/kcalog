import { useState } from 'react'
import { Card } from '../../ui/form'
import { InfoIcon } from '../../ui/icons'
import { MacroGuideSheet } from '../dashboard/MacroGuideSheet'

/**
 * 영양 목표 — 유지 칼로리(TDEE)와 목표 섭취를 나란히 두고 차이를 보여준다.
 * 탄단지 목표(g)는 서버가 칼로리 목표, 체중, 근육량 목표에서 파생해 내려준 값을 그대로 쓴다
 * (프론트에 비율 상수를 복제하지 않는다).
 */
export function NutritionTargetCard({
  maintenanceKcal,
  targetKcal,
  carbTargetG,
  proteinTargetG,
  fatTargetG,
  onRecalc,
}: {
  maintenanceKcal: number | null
  targetKcal: number | null
  carbTargetG: number | null
  proteinTargetG: number | null
  fatTargetG: number | null
  onRecalc: () => void
}) {
  const [guideOpen, setGuideOpen] = useState(false)
  const diff = maintenanceKcal !== null && targetKcal !== null ? targetKcal - maintenanceKcal : null
  const macros = [
    { label: '탄수화물', grams: carbTargetG, bar: 'bg-carb' },
    { label: '단백질', grams: proteinTargetG, bar: 'bg-protein' },
    { label: '지방', grams: fatTargetG, bar: 'bg-fat' },
  ]

  return (
    <Card className="border border-border">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted">영양 목표</p>
          <p className="mt-0.5 text-base font-black text-ink">하루 기준</p>
        </div>
        {/*
          "조정"은 무엇을 조정하는지 말하지 않아, 설정 메뉴의 "프로필 편집"과 같은 시트를 열어도
          아무도 눈치채지 못했다. 이름이 도착지를 말하게 한다(design D3).
        */}
        <button type="button" onClick={onRecalc} className="shrink-0 text-xs font-bold text-brand-ink">
          유지칼로리 다시 계산
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-tile bg-brand-soft p-3">
          <p className="text-[11px] font-semibold text-brand-ink">유지 칼로리</p>
          <p className="mt-0.5 text-xl font-black text-ink">
            {maintenanceKcal === null ? '-' : maintenanceKcal.toLocaleString()}
            <span className="ml-0.5 text-[11px] font-bold text-muted">kcal</span>
          </p>
          <p className="mt-0.5 text-[10px] font-medium text-muted">TDEE (기초+활동)</p>
        </div>
        <div className="rounded-tile bg-success-soft p-3">
          <p className="text-[11px] font-semibold text-success">목표 섭취</p>
          <p className="mt-0.5 text-xl font-black text-ink">
            {targetKcal === null ? '-' : targetKcal.toLocaleString()}
            <span className="ml-0.5 text-[11px] font-bold text-muted">kcal</span>
          </p>
          <p className="mt-0.5 text-[10px] font-medium text-muted">
            {diff === null ? '목표 미설정' : diff === 0 ? '유지 칼로리와 동일' : `${diff > 0 ? '+' : ''}${diff}kcal`}
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs font-semibold text-ink">탄단지 목표</p>
        <div className="flex items-center gap-1">
          <p className="text-[11px] font-medium text-muted">g 단위</p>
          {/* 상시 노출하지 않고 누른 사람에게만 보여준다 (design D9) */}
          <button
            type="button"
            aria-label="탄단지 목표 안내 열기"
            onClick={() => setGuideOpen(true)}
            className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-muted touch-manipulation focus-visible:ring-2 focus-visible:ring-brand-ink"
          >
            <InfoIcon />
          </button>
        </div>
      </div>
      <ul className="mt-2 space-y-2.5">
        {macros.map((macro) => (
          <li key={macro.label}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-ink">{macro.label}</span>
              <span className="font-bold text-ink">{macro.grams === null ? '-' : `${macro.grams}g`}</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-track">
              {/* 목표치를 그대로 채운 막대 — 색으로 항목을 구분하는 용도다 */}
              <div className={`h-full w-full rounded-full ${macro.grams === null ? 'bg-track' : macro.bar}`} />
            </div>
          </li>
        ))}
      </ul>

      {guideOpen && <MacroGuideSheet onClose={() => setGuideOpen(false)} />}
    </Card>
  )
}
