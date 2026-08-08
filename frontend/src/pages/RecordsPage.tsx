import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { deleteMeal, getMeals, updateMeal } from '../api/meal'
import type { Meal } from '../api/meal'
import { MEAL_TYPE_LABELS, validateNutrition } from '../features/meal/mealDefaults'
import type { NutritionErrors } from '../features/meal/mealDefaults'
import { toNumber } from '../api/memberValidation'
import { Button, Card, Field, TextInput } from '../ui/form'

function todayLocalDate(): string {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

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
  const [kcal, setKcal] = useState(String(meal.totalKcal))
  const [carb, setCarb] = useState(String(meal.carbG))
  const [protein, setProtein] = useState(String(meal.proteinG))
  const [fat, setFat] = useState(String(meal.fatG))
  const [errors, setErrors] = useState<NutritionErrors>({})

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['meals'] })
  const removeMutation = useMutation({ mutationFn: () => deleteMeal(meal.id), onSuccess: invalidate })
  const updateMutation = useMutation({
    mutationFn: (body: Parameters<typeof updateMeal>[1]) => updateMeal(meal.id, body),
    onSuccess: () => {
      setEditing(false)
      void invalidate()
    },
  })

  function save() {
    const values = {
      totalKcal: toNumber(kcal),
      carbG: toNumber(carb),
      proteinG: toNumber(protein),
      fatG: toNumber(fat),
    }
    const fieldErrors = validateNutrition(values)
    setErrors(fieldErrors)
    if (Object.keys(fieldErrors).length > 0) return
    updateMutation.mutate({
      totalKcal: values.totalKcal!,
      carbG: values.carbG!,
      proteinG: values.proteinG!,
      fatG: values.fatG!,
    })
  }

  if (!editing) {
    return (
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <span className="font-medium">{MEAL_TYPE_LABELS[meal.mealType]}</span>
            <span className="ml-2 text-brand">{meal.totalKcal} kcal</span>
            <p className="mt-1 text-sm text-muted">
              탄 {meal.carbG} · 단 {meal.proteinG} · 지 {meal.fatG}
            </p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => setEditing(true)}>
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
      <Field id={`kcal-${meal.id}`} label="칼로리 (kcal)" error={errors.totalKcal}>
        <TextInput id={`kcal-${meal.id}`} inputMode="numeric" value={kcal} onChange={(e) => setKcal(e.target.value)} />
      </Field>
      <Field id={`carb-${meal.id}`} label="탄수화물 (g)" error={errors.carbG}>
        <TextInput id={`carb-${meal.id}`} inputMode="decimal" value={carb} onChange={(e) => setCarb(e.target.value)} />
      </Field>
      <Field id={`protein-${meal.id}`} label="단백질 (g)" error={errors.proteinG}>
        <TextInput id={`protein-${meal.id}`} inputMode="decimal" value={protein} onChange={(e) => setProtein(e.target.value)} />
      </Field>
      <Field id={`fat-${meal.id}`} label="지방 (g)" error={errors.fatG}>
        <TextInput id={`fat-${meal.id}`} inputMode="decimal" value={fat} onChange={(e) => setFat(e.target.value)} />
      </Field>
      <div className="flex gap-2">
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
