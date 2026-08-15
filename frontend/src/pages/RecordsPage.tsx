import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router'
import { getMeals, saveMeal } from '../api/meal'
import type { Meal, MealType } from '../api/meal'
import { AddFoodPanel } from '../features/food/AddFoodPanel'
import { EmptyMeals } from '../features/meal/EmptyMeals'
import { MealCard } from '../features/meal/MealCard'
import { MealTypeSegments } from '../features/meal/MealTypeSegments'
import { RecordsDateHeader } from '../features/meal/RecordsDateHeader'
import { MacroChips } from '../ui/MacroChips'
import { MEAL_TYPE_LABELS, MEAL_TYPE_ORDER, defaultMealType } from '../features/meal/mealDefaults'
import { toSaveItems } from '../features/meal/mealItems'
import type { EditableItem } from '../features/meal/mealItems'
import { eatenAtFor, todayServiceDate } from '../lib/date'
import { round1 } from '../lib/number'
import { useMutationWithError } from '../lib/useMutationWithError'
import { ErrorNotice } from '../ui/ErrorNotice'
import { ListSkeleton } from '../ui/ListSkeleton'

/**
 * 음식기록 탭 — 끼니 세그먼트로 그 끼니의 기록·합계를 보고, 아래 "지금 추가하기"에서 바로 담는다(design D1).
 * 세그먼트는 보기 필터이자 등록 대상이다. 담을 때마다 기록(Meal)이 하나씩 생긴다(design D2).
 * FAB에서 `?camera=1`로 들어오면 AI 탭이 열리며 촬영이 바로 뜬다(design D13).
 */
export function RecordsPage() {
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const autoCamera = searchParams.get('camera') === '1'

  // 화면을 열어둔 채 05시를 넘기면 "오늘"이 바뀐다 — 돌아올 때 다시 읽어 어제 날짜에 담기는 걸 막는다
  const [today, setToday] = useState(todayServiceDate)
  useEffect(() => {
    const sync = () => {
      if (document.visibilityState === 'visible') setToday(todayServiceDate())
    }
    document.addEventListener('visibilitychange', sync)
    return () => document.removeEventListener('visibilitychange', sync)
  }, [])

  /*
    보는 날짜는 **주소가 들고 있다**(`?date=`). 화면 상태로만 두면 홈에서 날짜를 옮기고 넘어와도
    기록 화면은 늘 오늘이라 두 화면이 서로 다른 날을 본다(design D21).
    파라미터가 없으면 오늘 — 05시 경계를 넘기면 `today`가 갱신되며 함께 따라온다.

    ⚠️ 위 sync는 **화면이 돌아올 때만** 돈다. 포그라운드에 열어둔 채 경계를 넘기면 여기 `date`가
    낡은 채로 남으므로, 담는 경로(`recordItems`)는 그때 서비스일을 한 번 더 읽는다.
  */
  const date = parseDate(searchParams.get('date'), today) ?? today
  function setDate(next: string) {
    const params = new URLSearchParams(searchParams)
    if (next === today) params.delete('date')
    else params.set('date', next)
    setSearchParams(params, { replace: true })
  }

  // 홈의 촬영 카드가 끼니를 실어 보내면 그것을 쓴다 — 여기서 다시 시각을 보면 끼니 경계를
  // 사이에 두고 카드에 적힌 것과 갈린다(design D1). 직접 들어온 경우에만 시각으로 정한다.
  const [mealType, setMealType] = useState<MealType>(
    () => parseMealType(searchParams.get('meal')) ?? defaultMealType(new Date()),
  )

  const { data: meals, isPending } = useQuery({
    queryKey: ['meals', date],
    queryFn: () => getMeals(date),
  })

  // 실패한 저장 요청을 들고 있다가 "다시 시도"로 그대로 재전송한다(design D3).
  // 담기 시트는 이미 닫혀 항목이 화면에서 사라졌으므로, 여기서 안 들고 있으면 처음부터 다시 입력해야 한다.
  const [failed, setFailed] = useState<Parameters<typeof saveMeal>[0] | null>(null)

  const saveMutation = useMutationWithError(saveMeal, {
    errorMessage: '기록을 저장하지 못했어요.',
    onSuccess: () => {
      setFailed(null)
      void queryClient.invalidateQueries({ queryKey: ['meals'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] }) // 홈 집계도 갱신
      // 촬영이 끝나면 자동 열기 신호만 지운다 — 통째로 비우면 보고 있던 날짜(`date`)까지 날아간다
      if (autoCamera) {
        const params = new URLSearchParams(searchParams)
        params.delete('camera')
        setSearchParams(params, { replace: true })
      }
    },
  })

  function submitSave(body: Parameters<typeof saveMeal>[0]) {
    setFailed(body) // 성공하면 onSuccess가 비운다
    saveMutation.mutate(body)
  }

  const all = meals ?? []
  const counts = countByMealType(all)
  const selected = all.filter((meal) => meal.mealType === mealType)
  const totals = sumMeals(selected)

  function recordItems(items: EditableItem[], analysisJobId?: number) {
    /*
      담는 순간 서비스일을 **다시 읽는다.** `today`는 마운트와 visibilitychange에서만 갱신되는데,
      화면을 포그라운드에 열어둔 채 05시를 넘기면 그 둘 다 일어나지 않아 값이 낡는다.
      낡은 날짜로 담으면 `eatenAtFor`가 과거 분기를 타 **전날 정오**로 저장된다 —
      하필 05시 경계가 있는 이유인 야식 사용자가 정확히 이 경우다(PR #42 리뷰).

      지난 날짜를 보고 있을 때는 그대로 둔다. 무조건 오늘로 밀어넣던 예전 동작으로 돌아가면
      날짜 선택 자체가 무의미해진다.
    */
    const freshToday = todayServiceDate()
    const viewingToday = date === today
    // 화면의 "오늘"도 함께 갱신한다 — 주간 띠·날짜 상한·목록 조회가 낡은 날에 머물지 않게
    if (freshToday !== today) setToday(freshToday)

    submitSave({
      eatenAt: eatenAtFor(viewingToday ? freshToday : date),
      mealType,
      source: analysisJobId ? 'AI' : 'MANUAL',
      items: toSaveItems(items),
      ...(analysisJobId ? { analysisJobId } : {}),
    })
  }

  return (
    <section>
      <RecordsDateHeader date={date} today={today} onChange={setDate} />

      {/* 끼니 탭은 날짜 머리 바로 아래 — 밑줄이 화면 끝까지 닿게 좌우 여백을 거스른다 */}
      <div className="-mx-4">
        <MealTypeSegments selected={mealType} counts={counts} onSelect={setMealType} />
      </div>

      {isPending ? (
        <ListSkeleton rows={2} className="mt-3" />
      ) : selected.length === 0 ? (
        <EmptyMeals mealType={mealType} />
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
          {/*
            그 끼니의 결론이라 브랜드 톤으로 물들여 표 본문과 분명히 갈라놓는다.

            라벨·칼로리·탄단지 칩 셋을 한 줄에 밀어 넣었더니 좁은 화면에서 **셋 다 줄바꿈됐다**
            ("저녁 합/계", "1,205/kcal"). 줄을 둘로 나누고 각 덩어리는 접히지 않게 한다.
          */}
          <div className="border-t border-brand/10 bg-brand-soft px-4 py-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="whitespace-nowrap text-[13px] font-bold text-ink">
                {MEAL_TYPE_LABELS[mealType]} 합계
              </span>
              <span className="whitespace-nowrap text-base font-black tabular-nums text-brand-ink">
                {totals.kcal.toLocaleString()} kcal
              </span>
            </div>
            <div className="mt-1.5">
              <MacroChips carbG={totals.carbG} proteinG={totals.proteinG} fatG={totals.fatG} />
            </div>
          </div>
        </div>
      )}

      {/* 담은 항목을 들고 있으므로 한 번에 다시 보낼 수 있다 — 분석 결과면 analysisJobId도 그대로라
          재분석 없이 저장되어 일일 분석 횟수를 다시 쓰지 않는다 */}
      <ErrorNotice
        message={saveMutation.error}
        className="mt-2"
        action={
          failed && (
            <button
              type="button"
              onClick={() => submitSave(failed)}
              disabled={saveMutation.isPending}
              className="rounded-tile px-2 py-1 font-bold underline underline-offset-2 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-danger"
            >
              다시 시도
            </button>
          )
        }
      />

      <AddFoodPanel
        mealType={mealType}
        autoCamera={autoCamera}
        saving={saveMutation.isPending}
        onMealTypeChange={setMealType}
        onRecordItems={recordItems}
      />
    </section>
  )
}

/** 쿼리로 들어온 끼니 — 주소창은 아무 값이나 담을 수 있으므로 아는 값만 받는다 */
function parseMealType(value: string | null): MealType | null {
  return MEAL_TYPE_ORDER.includes(value as MealType) ? (value as MealType) : null
}

/**
 * 쿼리로 들어온 날짜 — 형식이 맞고 **오늘 이후가 아닌** 값만 받는다.
 * 미래 날짜를 받아주면 아직 먹지 않은 날에 기록을 담을 수 있게 된다.
 */
function parseDate(value: string | null, today: string): string | null {
  if (value === null || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  if (Number.isNaN(new Date(`${value}T12:00:00Z`).getTime())) return null
  return value > today ? null : value
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
