import { Button } from '../../ui/form'
import { ItemNutritionFields } from './ItemNutritionFields'
import { MAX_ITEMS, emptyItem, totals } from './mealItems'
import type { EditableItem, ItemErrors } from './mealItems'

/** 합계 한 줄 — 리스트 편집기와 오버레이 모드가 공유 */
export function TotalsLine({ items }: { items: EditableItem[] }) {
  const t = totals(items)
  return (
    <p className="text-sm font-medium text-ink">
      합계 <span className="text-brand-ink">{t.kcal} kcal</span>
      <span className="ml-2 text-muted">
        탄 {t.carbG} · 단 {t.proteinG} · 지 {t.fatG}
      </span>
    </p>
  )
}

/** 음식 항목 편집기 — 항목별 이름·영양값 수정, 추가·삭제, 합계 실시간 표시.
 *  식사 기록(확인 화면)과 기록 탭(수정)이 공유한다. box는 오버레이 전용이라 여기서 다루지 않는다 */
export function MealItemsEditor({
  items,
  errors,
  formError,
  onChange,
  idPrefix,
}: {
  items: EditableItem[]
  errors: ItemErrors[]
  formError: string | null
  onChange: (items: EditableItem[]) => void
  idPrefix: string
}) {
  const patch = (i: number, part: Partial<EditableItem>) =>
    onChange(items.map((it, idx) => (idx === i ? { ...it, ...part } : it)))
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i))
  const add = () => onChange([...items, emptyItem()])

  return (
    <div>
      <ul className="space-y-4">
        {items.map((item, i) => (
          <li key={i} className="rounded-md border border-border p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-muted">음식 {i + 1}</span>
              {items.length > 1 && (
                <Button type="button" variant="ghost" onClick={() => remove(i)} aria-label={`음식 ${i + 1} 삭제`}>
                  삭제
                </Button>
              )}
            </div>
            <ItemNutritionFields
              item={item}
              errors={errors[i] ?? {}}
              onChange={(part) => patch(i, part)}
              idPrefix={`${idPrefix}-${i}`}
            />
          </li>
        ))}
      </ul>

      {formError && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {formError}
        </p>
      )}

      <Button
        type="button"
        variant="secondary"
        onClick={add}
        disabled={items.length >= MAX_ITEMS}
        className="mt-3 w-full"
      >
        + 음식 추가
      </Button>

      <div className="mt-3">
        <TotalsLine items={items} />
      </div>
    </div>
  )
}
