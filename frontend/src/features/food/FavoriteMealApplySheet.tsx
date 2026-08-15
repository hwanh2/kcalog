import { useState } from 'react'
import type { FavoriteMeal } from '../../api/favoriteMeal'
import type { MealType } from '../../api/meal'
import { formatQuantity, round1, round2 } from '../../lib/number'
import { Button } from '../../ui/form'
import { MacroChips } from '../../ui/MacroChips'
import { Sheet } from '../../ui/Sheet'
import { RecordButton } from '../meal/RecordButton'
import { fromFood } from '../meal/mealItems'
import type { EditableItem } from '../meal/mealItems'
import { scaleNutrition, stepFor } from './scale'

/**
 * 세트 담기 — 든 음식을 보여주고 빼거나 수량을 고친 뒤 그 끼니로 기록한다(design D4).
 *
 * ⚠️ **세트 자체는 바뀌지 않는다.** 오늘 밥을 반만 먹었다고 틀이 반으로 줄면 안 된다.
 * 여기서 고친 것은 이번에 담는 값에만 적용된다.
 */
export function FavoriteMealApplySheet({
  set,
  mealType,
  busy,
  onMealTypeChange,
  onSubmit,
  onClose,
}: {
  set: FavoriteMeal
  mealType: MealType
  busy?: boolean
  onMealTypeChange: (next: MealType) => void
  onSubmit: (items: EditableItem[]) => void
  onClose: () => void
}) {
  // 세트 원본은 건드리지 않고 이번 담기용 사본만 고친다
  const [rows, setRows] = useState(() => set.items.map((item) => ({ item, quantity: item.quantity })))
  const [removed, setRemoved] = useState<Set<number>>(new Set())

  const kept = rows.filter((_, index) => !removed.has(index))
  const scaled = kept.map((row) => scaleNutrition(row.item, row.item.quantity, row.quantity))
  const totals = {
    kcal: scaled.reduce((sum, n) => sum + n.kcal, 0),
    carbG: round1(scaled.reduce((sum, n) => sum + n.carbG, 0)),
    proteinG: round1(scaled.reduce((sum, n) => sum + n.proteinG, 0)),
    fatG: round1(scaled.reduce((sum, n) => sum + n.fatG, 0)),
  }

  function changeQuantity(index: number, delta: number) {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row
        const step = stepFor(row.item.unit)
        return { ...row, quantity: Math.max(step, round2(row.quantity + delta)) }
      }),
    )
  }

  function submit() {
    const items = kept.map((row) =>
      fromFood(
        { name: row.item.name, unit: row.item.unit },
        row.quantity,
        scaleNutrition(row.item, row.item.quantity, row.quantity),
      ),
    )
    onSubmit(items)
  }

  return (
    <Sheet label={`${set.name} 담기`} onClose={onClose}>
      <div className="min-w-0 pr-12">
        <p className="truncate text-lg font-bold text-ink">{set.name}</p>
        <p className="text-xs text-muted">빼거나 수량을 고쳐 담을 수 있어요. 세트는 그대로 남아요.</p>
      </div>

      <ul className="mt-4 space-y-2">
        {rows.map((row, index) => {
          const isRemoved = removed.has(index)
          const nutrition = scaleNutrition(row.item, row.item.quantity, row.quantity)
          return (
            <li
              key={index}
              className={`rounded-2xl border border-border p-3 ${isRemoved ? 'opacity-50' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className={`truncate text-sm font-semibold text-ink ${isRemoved ? 'line-through' : ''}`}>
                    {row.item.name}
                  </p>
                  <p className="text-xs tabular-nums text-muted">
                    {formatQuantity(row.quantity)}
                    {row.item.unit} · {nutrition.kcal.toLocaleString()}kcal
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={`${row.item.name} ${isRemoved ? '다시 담기' : '빼기'}`}
                  aria-pressed={isRemoved}
                  onClick={() =>
                    setRemoved((prev) => {
                      const next = new Set(prev)
                      if (next.has(index)) next.delete(index)
                      else next.add(index)
                      return next
                    })
                  }
                  className="-mr-1 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xs font-bold text-muted touch-manipulation focus-visible:ring-2 focus-visible:ring-brand-ink"
                >
                  {isRemoved ? '되돌리기' : '빼기'}
                </button>
              </div>

              {!isRemoved && (
                <div className="mt-2 flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    aria-label={`${row.item.name} 수량 줄이기`}
                    onClick={() => changeQuantity(index, -stepFor(row.item.unit))}
                  >
                    −
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    aria-label={`${row.item.name} 수량 늘리기`}
                    onClick={() => changeQuantity(index, stepFor(row.item.unit))}
                  >
                    ＋
                  </Button>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      <div className="mt-4 flex items-center justify-between rounded-2xl bg-brand-soft px-4 py-3">
        <span className="text-[13px] font-bold text-ink">합계 {kept.length}개</span>
        <span className="flex items-center gap-2">
          <span className="text-base font-black tabular-nums text-brand-ink">
            {totals.kcal.toLocaleString()} kcal
          </span>
          <MacroChips carbG={totals.carbG} proteinG={totals.proteinG} fatG={totals.fatG} />
        </span>
      </div>

      <RecordButton
        mealType={mealType}
        onMealTypeChange={onMealTypeChange}
        onClick={submit}
        disabled={busy || kept.length === 0}
        label={kept.length === 0 ? '담을 음식이 없어요' : '기록하기'}
      />
    </Sheet>
  )
}
