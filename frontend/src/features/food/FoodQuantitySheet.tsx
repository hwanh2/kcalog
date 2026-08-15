import { useState } from 'react'
import type { Food } from '../../api/food'
import type { MealType } from '../../api/meal'
import { RecordButton } from '../meal/RecordButton'
import { Button } from '../../ui/form'
import { MacroChips } from '../../ui/MacroChips'
import { Sheet } from '../../ui/Sheet'
import { formatQuantity, round2 } from '../../lib/number'
import { scaleNutrition, stepFor } from './scale'

/**
 * 담기 시트 — 수량을 조절하면 영양값이 비례해 바뀌고, 확인하면 그 끼니로 기록된다(design D1).
 * 마무리 줄은 담는 모든 자리와 같은 `RecordButton` — 끼니가 보이고, 그 자리에서 바꿀 수 있다.
 */
export function FoodQuantitySheet({
  food,
  mealType,
  busy,
  onMealTypeChange,
  onSubmit,
  onClose,
}: {
  food: Food
  mealType: MealType
  busy?: boolean
  onMealTypeChange: (next: MealType) => void
  onSubmit: (quantity: number, nutrition: ReturnType<typeof scaleNutrition>) => void
  onClose: () => void
}) {
  const [quantity, setQuantity] = useState(food.quantity)
  const step = stepFor(food.unit)
  const nutrition = scaleNutrition(food, food.quantity, quantity)
  const change = (delta: number) => setQuantity((q) => Math.max(step, round2(q + delta)))

  return (
    <Sheet label={`${food.name} 담기`} onClose={onClose}>
      {/* pr-12 — 시트 오른쪽 위 닫기 버튼 자리(긴 이름이 밑으로 파고들지 않게) */}
      <div className="min-w-0 pr-12">
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

      <RecordButton
        mealType={mealType}
        onMealTypeChange={onMealTypeChange}
        onClick={() => onSubmit(quantity, nutrition)}
        disabled={busy}
      />
    </Sheet>
  )
}
