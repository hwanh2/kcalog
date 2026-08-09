import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteMeal, getMeals, updateMeal } from '../api/meal'
import type { Meal } from '../api/meal'
import { MEAL_TYPE_LABELS } from '../features/meal/mealDefaults'
import { MealItemsEditor } from '../features/meal/MealItemsEditor'
import { fromSaved, toSaveItems, validateItems } from '../features/meal/mealItems'
import type { EditableItem, ItemErrors } from '../features/meal/mealItems'
import { todayLocalDate } from '../lib/date'
import { Button, Card } from '../ui/form'

export function RecordsPage() {
  const [date, setDate] = useState(todayLocalDate)
  const { data: meals, isPending } = useQuery({
    queryKey: ['meals', date],
    queryFn: () => getMeals(date),
  })

  return (
    <section>
      <h1 className="text-xl font-semibold">기록</h1>

      <label htmlFor="date" className="mt-3 block text-sm text-muted">
        날짜
      </label>
      <input
        id="date"
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        className="mt-1 rounded-md border border-border bg-surface px-3 py-2"
      />

      {isPending && <p className="mt-4 text-muted">불러오는 중…</p>}
      {meals && meals.length === 0 && <p className="mt-4 text-muted">이 날의 식사 기록이 없어요.</p>}

      <ul className="mt-4 space-y-3">
        {meals?.map((meal) => (
          <li key={meal.id}>
            <MealRow meal={meal} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function MealRow({ meal }: { meal: Meal }) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [items, setItems] = useState<EditableItem[]>(() => meal.items.map(fromSaved))
  const [itemErrors, setItemErrors] = useState<ItemErrors[]>([])
  const [formError, setFormError] = useState<string | null>(null)

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['meals'] })
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] }) // 오늘 탭 집계도 갱신
  }
  const removeMutation = useMutation({ mutationFn: () => deleteMeal(meal.id), onSuccess: invalidate })
  const updateMutation = useMutation({
    mutationFn: (body: Parameters<typeof updateMeal>[1]) => updateMeal(meal.id, body),
    onSuccess: () => {
      setEditing(false)
      void invalidate()
    },
  })

  function startEdit() {
    setItems(meal.items.map(fromSaved))
    setItemErrors([])
    setFormError(null)
    setEditing(true)
  }

  function save() {
    const result = validateItems(items)
    setItemErrors(result.itemErrors)
    setFormError(result.formError)
    if (!result.valid) return
    updateMutation.mutate({ items: toSaveItems(items) })
  }

  if (!editing) {
    const names = meal.items.map((it) => it.name).join(' · ')
    return (
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <span className="font-medium">{MEAL_TYPE_LABELS[meal.mealType]}</span>
            <span className="ml-2 text-brand">{meal.totalKcal} kcal</span>
            {names && <p className="mt-1 text-sm text-ink">{names}</p>}
            <p className="mt-1 text-sm text-muted">
              탄 {meal.carbG} · 단 {meal.proteinG} · 지 {meal.fatG}
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={startEdit}>
              수정
            </Button>
            <Button type="button" variant="ghost" onClick={() => removeMutation.mutate()}>
              삭제
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <p className="mb-3 font-medium">{MEAL_TYPE_LABELS[meal.mealType]} 수정</p>
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
    </Card>
  )
}
