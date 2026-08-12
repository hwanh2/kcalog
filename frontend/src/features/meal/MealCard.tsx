import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { deleteMeal, updateMeal } from '../../api/meal'
import type { Meal } from '../../api/meal'
import { AuthImage } from '../../ui/AuthImage'
import { MacroChips } from '../../ui/MacroChips'
import { UtensilsIcon } from '../../ui/icons'
import { Button } from '../../ui/form'
import { MealItemsEditor } from './MealItemsEditor'
import { MEAL_TYPE_LABELS } from './mealDefaults'
import { fromSaved, toSaveItems, validateItems } from './mealItems'
import type { EditableItem, ItemErrors } from './mealItems'

/**
 * 저장된 기록 한 건(Meal) — 썸네일 · 끼니/시각 · 음식 이름 · 탄단지 칩 · 총 kcal · 삭제.
 * 담을 때마다 기록이 하나씩 생기므로(design D2) 삭제도 이 카드 단위다. 카드를 누르면 항목 편집으로 바뀐다.
 */
export function MealCard({ meal }: { meal: Meal }) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [items, setItems] = useState<EditableItem[]>(() => meal.items.map(fromSaved))
  const [itemErrors, setItemErrors] = useState<ItemErrors[]>([])
  const [formError, setFormError] = useState<string | null>(null)

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['meals'] })
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] }) // 홈 집계도 갱신
  }
  const removeMutation = useMutation({ mutationFn: () => deleteMeal(meal.id), onSuccess: invalidate })
  const updateMutation = useMutation({
    mutationFn: (body: Parameters<typeof updateMeal>[1]) => updateMeal(meal.id, body),
    onSuccess: () => {
      setEditing(false)
      invalidate()
    },
  })

  function save() {
    const result = validateItems(items)
    setItemErrors(result.itemErrors)
    setFormError(result.formError)
    if (!result.valid) return
    updateMutation.mutate({ items: toSaveItems(items) })
  }

  if (editing) {
    return (
      <div className="p-3">
        <MealItemsEditor
          items={items}
          errors={itemErrors}
          formError={formError}
          onChange={(next) => {
            // 편집 시 오류 초기화 — 인덱스 어긋남 방지 + 입력하면 오류가 사라지는 UX
            setItems(next)
            setItemErrors([])
            setFormError(null)
          }}
          idPrefix={`edit-${meal.id}`}
        />
        <div className="mt-4 flex gap-2">
          <Button type="button" variant="secondary" onClick={() => setEditing(false)} className="flex-1">
            취소
          </Button>
          <Button type="button" onClick={save} disabled={updateMutation.isPending} className="flex-1">
            저장
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 p-3">
      {meal.imageUrl ? (
        <AuthImage src={meal.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-tile object-cover" />
      ) : (
        // 사진 없이 담은 기록(카탈로그·즐겨찾기·직접 입력)은 빈 칸 대신 같은 아이콘으로 통일한다
        <span
          aria-hidden
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-tile bg-canvas text-muted"
        >
          <UtensilsIcon size={22} />
        </span>
      )}

      <button
        type="button"
        onClick={() => {
          setItems(meal.items.map(fromSaved))
          setItemErrors([])
          setFormError(null)
          setEditing(true)
        }}
        aria-label={`${summarize(meal)} 수정`}
        className="min-w-0 flex-1 text-left"
      >
        <p className="text-[11px] font-medium text-muted">
          {MEAL_TYPE_LABELS[meal.mealType]} · {formatTime(meal.eatenAt)}
        </p>
        <p className="truncate text-sm font-semibold text-ink">{summarize(meal)}</p>
        <div className="mt-1">
          <MacroChips carbG={meal.carbG} proteinG={meal.proteinG} fatG={meal.fatG} />
        </div>
      </button>

      <div className="flex shrink-0 flex-col items-end gap-1">
        <p className="text-sm font-bold text-ink">
          {meal.totalKcal.toLocaleString()}
          <span className="ml-0.5 text-[11px] font-medium text-muted">kcal</span>
        </p>
        <button
          type="button"
          aria-label={`${summarize(meal)} 삭제`}
          onClick={() => removeMutation.mutate()}
          disabled={removeMutation.isPending}
          className="rounded-lg p-1.5 text-muted disabled:opacity-50"
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  )
}

/** "오트밀 & 계란 2개" — 음식 이름을 이어 붙이고, 수량이 있으면 함께 보여준다 */
function summarize(meal: Meal): string {
  return meal.items
    .map((item) =>
      item.quantity !== null && item.unit !== null
        ? `${item.name} ${Math.round(item.quantity * 100) / 100}${item.unit}`
        : item.name,
    )
    .join(' & ')
}

/** 섭취 시각 HH:MM (서비스 기준 시간대) */
function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso))
}

function TrashIcon() {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13" />
    </svg>
  )
}
