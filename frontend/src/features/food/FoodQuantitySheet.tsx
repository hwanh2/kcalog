import { useState } from 'react'
import type { Food } from '../../api/food'
import type { MealType } from '../../api/meal'
import { MEAL_TYPE_LABELS } from '../meal/mealDefaults'
import { Button } from '../../ui/form'
import { MacroChips } from '../../ui/MacroChips'
import { Sheet } from '../../ui/Sheet'
import { formatQuantity } from './quantity'
import { scaleNutrition, stepFor } from './scale'

/**
 * 담기 시트 — 수량을 조절하면 영양값이 비례해 바뀌고, 확인하면 그 끼니로 기록된다(design D1).
 * 버튼 문구에 끼니 이름을 박아 잘못된 끼니에 담는 사고를 줄인다.
 */
export function FoodQuantitySheet({
  food,
  mealType,
  busy,
  onSubmit,
  onClose,
}: {
  food: Food
  mealType: MealType
  busy?: boolean
  onSubmit: (quantity: number, nutrition: ReturnType<typeof scaleNutrition>) => void
  onClose: () => void
}) {
  const [quantity, setQuantity] = useState(food.quantity)
  const step = stepFor(food.unit)
  const nutrition = scaleNutrition(food, food.quantity, quantity)
  const change = (delta: number) => setQuantity((q) => Math.max(step, round2(q + delta)))

  return (
    <Sheet label={`${food.name} 담기`} onClose={onClose}>
      <div className="min-w-0">
        <p className="truncate text-lg font-bold text-ink">{food.name}</p>
        <p className="text-xs text-muted">
          기준 {formatQuantity(food.quantity)}
          {food.unit} · {food.kcal}kcal
        </p>
      </div>

      <div className="mt-4 flex items-center justify-center gap-4">
        <Button type="button" variant="secondary" aria-label="수량 줄이기" onClick={() => change(-step)}>
          −
        </Button>
        <p className="min-w-24 text-center text-2xl font-black text-ink">
          {formatQuantity(quantity)}
          <span className="ml-1 text-base font-bold text-muted">{food.unit}</span>
        </p>
        <Button type="button" variant="secondary" aria-label="수량 늘리기" onClick={() => change(step)}>
          +
        </Button>
      </div>

      <div className="mt-4 rounded-2xl bg-canvas p-3">
        <p className="text-center text-3xl font-black text-ink">
          {nutrition.kcal.toLocaleString()}
          <span className="ml-1 text-base font-bold text-muted">kcal</span>
        </p>
        <div className="mt-2 flex justify-center">
          <MacroChips carbG={nutrition.carbG} proteinG={nutrition.proteinG} fatG={nutrition.fatG} />
        </div>
      </div>

      <Button
        type="button"
        onClick={() => onSubmit(quantity, nutrition)}
        disabled={busy}
        className="mt-4 w-full py-3"
      >
        {MEAL_TYPE_LABELS[mealType]}에 기록하기
      </Button>
    </Sheet>
  )
}

/** 0.5 단위까지만 쓰므로 소수 둘째 자리에서 잘라 부동소수 잔차를 없앤다 */
function round2(value: number): number {
  return Math.round(value * 100) / 100
}
