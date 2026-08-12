import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router'
import { getMeals, saveMeal } from '../api/meal'
import type { Meal, MealType } from '../api/meal'
import { AddFoodPanel } from '../features/food/AddFoodPanel'
import { MealCard } from '../features/meal/MealCard'
import { MealTypeSegments } from '../features/meal/MealTypeSegments'
import { MacroChips } from '../ui/MacroChips'
import { MEAL_TYPE_LABELS, MEAL_TYPE_ORDER, defaultMealType } from '../features/meal/mealDefaults'
import { toSaveItems } from '../features/meal/mealItems'
import type { EditableItem } from '../features/meal/mealItems'
import { eatenAtFor, todayServiceDate } from '../lib/date'
import { round1 } from '../lib/number'
import { Card } from '../ui/form'

/**
 * 음식기록 탭 — 끼니 세그먼트로 그 끼니의 기록·합계를 보고, 아래 "지금 추가하기"에서 바로 담는다(design D1).
 * 세그먼트는 보기 필터이자 등록 대상이다. 담을 때마다 기록(Meal)이 하나씩 생긴다(design D2).
 * FAB에서 `?camera=1`로 들어오면 AI 탭이 열리며 촬영이 바로 뜬다(design D13).
 */
export function RecordsPage() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const autoCamera = searchParams.get('camera') === '1'

  const [date, setDate] = useState(todayServiceDate)
  const [mealType, setMealType] = useState<MealType>(() => defaultMealType(new Date()))

  // 화면을 열어둔 채 05시를 넘기면 "오늘"이 바뀐다 — 돌아올 때 다시 읽어 어제 날짜에 담기는 걸 막는다
  useEffect(() => {
    const sync = () => {
      if (document.visibilityState === 'visible') setDate(todayServiceDate())
    }
    document.addEventListener('visibilitychange', sync)
    return () => document.removeEventListener('visibilitychange', sync)
  }, [])

  const { data: meals, isPending } = useQuery({
    queryKey: ['meals', date],
    queryFn: () => getMeals(date),
  })

  const saveMutation = useMutation({
    mutationFn: saveMeal,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['meals'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] }) // 홈 집계도 갱신
      if (autoCamera) setSearchParams({}, { replace: true }) // 촬영이 끝나면 자동 열기 신호를 지운다
    },
  })

  const all = meals ?? []
  const counts = countByMealType(all)
  const selected = all.filter((meal) => meal.mealType === mealType)
  const totals = sumMeals(selected)

  function recordItems(items: EditableItem[], analysisJobId?: number) {
    // 담는 순간의 "오늘"을 다시 읽는다 — 04:59에 연 화면으로 05:01에 담아도 오늘로 들어가게
    const target = todayServiceDate()
    if (target !== date) setDate(target)
    saveMutation.mutate({
      eatenAt: eatenAtFor(target),
      mealType,
      source: analysisJobId ? 'AI' : 'MANUAL',
      items: toSaveItems(items),
      ...(analysisJobId ? { analysisJobId } : {}),
    })
  }

  return (
    <section>
      {/* 제목·날짜 선택은 두지 않는다 — 이 탭은 "오늘 담는 화면"이고, 지난 날짜는 홈에서 넘겨본다 */}
      <MealTypeSegments selected={mealType} counts={counts} onSelect={setMealType} />

      {isPending ? (
        <p className="mt-4 text-muted">불러오는 중…</p>
      ) : selected.length === 0 ? (
        <Card className="mt-3">
          <p className="text-center text-sm text-muted">
            {MEAL_TYPE_LABELS[mealType]} 기록이 없어요. 아래에서 추가해보세요.
          </p>
        </Card>
      ) : (
        // 기록은 한 장의 표로 쌓이고 합계가 그 표의 마지막 줄이 된다 — 아래 "추가" 영역과 구분되도록
        <div className="mt-3 overflow-hidden rounded-card border border-border bg-surface">
          <ul className="divide-y divide-border">
            {selected.map((meal) => (
              <li key={meal.id}>
                <MealCard meal={meal} />
              </li>
            ))}
          </ul>
          {/* 그 끼니의 결론이라 브랜드 톤으로 물들여 표 본문과 분명히 갈라놓는다 */}
          <div className="flex items-center justify-between gap-2 border-t border-brand/10 bg-brand-soft px-4 py-3">
            <span className="text-[13px] font-bold text-ink">{MEAL_TYPE_LABELS[mealType]} 합계</span>
            <span className="flex items-center gap-2">
              <span className="text-base font-black text-brand-ink">{totals.kcal.toLocaleString()} kcal</span>
              <MacroChips carbG={totals.carbG} proteinG={totals.proteinG} fatG={totals.fatG} />
            </span>
          </div>
        </div>
      )}

      {saveMutation.isError && (
        <p role="alert" className="mt-2 text-sm text-danger">
          저장에 실패했어요. 잠시 후 다시 시도해주세요.
        </p>
      )}

      <AddFoodPanel
        mealType={mealType}
        autoCamera={autoCamera}
        saving={saveMutation.isPending}
        onRecordItems={recordItems}
      />
    </section>
  )
}

/** 세그먼트 배지 — 끼니별 기록 수 */
function countByMealType(meals: Meal[]): Record<MealType, number> {
  const counts = Object.fromEntries(MEAL_TYPE_ORDER.map((type) => [type, 0])) as Record<MealType, number>
  for (const meal of meals) {
    counts[meal.mealType] = (counts[meal.mealType] ?? 0) + 1
  }
  return counts
}

/** 끼니 합계 — 그 끼니 기록들의 합(서버가 계산해둔 기록별 합계를 더한다) */
function sumMeals(meals: Meal[]) {
  return meals.reduce(
    (acc, meal) => ({
      kcal: acc.kcal + meal.totalKcal,
      carbG: round1(acc.carbG + meal.carbG),
      proteinG: round1(acc.proteinG + meal.proteinG),
      fatG: round1(acc.fatG + meal.fatG),
    }),
    { kcal: 0, carbG: 0, proteinG: 0, fatG: 0 },
  )
}
