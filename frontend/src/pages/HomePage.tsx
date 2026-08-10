import { useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { getDashboard } from '../api/dashboard'
import { getMeals } from '../api/meal'
import type { Meal } from '../api/meal'
import { getWeights } from '../api/weight'
import { CalorieRing } from '../features/dashboard/CalorieRing'
import { MacroProgress } from '../features/dashboard/MacroProgress'
import { WeightMiniCard } from '../features/dashboard/WeightMiniCard'
import { suggestNextMealType } from '../features/dashboard/mealSuggest'
import { MEAL_TYPE_LABELS } from '../features/meal/mealDefaults'
import { addDays, todayLocalDate } from '../lib/date'
import { AuthImage } from '../ui/AuthImage'
import { Card } from '../ui/form'

/** 홈(오늘) — 날짜 이동 + 칼로리 링·탄단지 달성도·체중 미니카드·오늘 식사 목록·촬영 유도 (v2 목업 기준) */
export function HomePage() {
  const today = todayLocalDate()
  const [date, setDate] = useState(today)

  const dashboard = useQuery({ queryKey: ['dashboard', date], queryFn: () => getDashboard(date) })
  const meals = useQuery({ queryKey: ['meals', date], queryFn: () => getMeals(date) })
  const weights = useQuery({
    queryKey: ['weights', addDays(date, -29), date],
    queryFn: () => getWeights(addDays(date, -29), date),
  })

  return (
    <section className="space-y-4">
      <DateNav date={date} today={today} onChange={setDate} />

      {dashboard.isError && (
        <p className="text-danger">대시보드를 불러오지 못했어요. 잠시 후 다시 시도해주세요.</p>
      )}

      {dashboard.data && (
        <Card>
          <CalorieRing
            totalKcal={dashboard.data.totalKcal}
            dailyKcalTarget={dashboard.data.dailyKcalTarget}
            remainingKcal={dashboard.data.remainingKcal}
          />
        </Card>
      )}

      {dashboard.data && (
        <Card>
          <MacroProgress
            carbG={Number(dashboard.data.carbG)}
            proteinG={Number(dashboard.data.proteinG)}
            fatG={Number(dashboard.data.fatG)}
            carbTargetG={dashboard.data.carbTargetG}
            proteinTargetG={dashboard.data.proteinTargetG}
            fatTargetG={dashboard.data.fatTargetG}
          />
        </Card>
      )}

      <WeightMiniCard entries={weights.data ?? []} />

      <MealSection meals={meals.data ?? []} />
    </section>
  )
}

function DateNav({
  date,
  today,
  onChange,
}: {
  date: string
  today: string
  onChange: (d: string) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-bold">{formatDateLabel(date, today)}</span>
      {/* 캘린더 아이콘 위에 네이티브 날짜 선택을 덮어, 탭하면 그 자리에서 달력이 열린다 */}
      <div className="relative rounded-lg p-1.5 text-muted">
        <CalendarIcon />
        <input
          type="date"
          aria-label="날짜 선택"
          value={date}
          max={today}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </div>
    </div>
  )
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" strokeLinecap="round" />
    </svg>
  )
}

function MealSection({ meals }: { meals: Meal[] }) {
  const nextType = suggestNextMealType(meals.map((m) => m.mealType))

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-extrabold">오늘 기록한 식사</h2>
        <Link to="/records" className="flex items-center gap-0.5 text-xs font-bold text-brand">
          전체보기
          <Chevron dir="right" small />
        </Link>
      </div>

      {meals.length === 0 && <p className="px-1 text-muted">오늘 기록한 식사가 없어요.</p>}

      {meals.map((meal) => (
        <MealCard key={meal.id} meal={meal} />
      ))}

      <Link
        to="/meals/new"
        className="flex items-center justify-between rounded-card border-2 border-dashed border-border bg-canvas/60 p-3.5"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface text-muted">+</span>
          <span>
            <span className="block text-xs font-bold">{MEAL_TYPE_LABELS[nextType]} 촬영 및 기록</span>
            <span className="block text-[10px] text-muted">카메라로 찍으면 AI가 탄단지 자동 계산</span>
          </span>
        </span>
        <span className="rounded-lg bg-surface px-2.5 py-1 text-xs font-bold text-brand shadow-sm">기록하기</span>
      </Link>
    </div>
  )
}

function MealCard({ meal }: { meal: Meal }) {
  const names = meal.items.map((it) => it.name).join(' · ')
  return (
    <Card className="flex items-center gap-3">
      {meal.imageUrl && (
        <AuthImage src={meal.imageUrl} alt="식사 사진" className="h-14 w-14 shrink-0 rounded-xl object-cover" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase text-muted">
            {MEAL_TYPE_LABELS[meal.mealType]} · {formatTime(meal.eatenAt)}
          </span>
          <span className="text-xs font-black">{meal.totalKcal} kcal</span>
        </div>
        {names && <p className="mt-0.5 truncate text-xs font-bold">{names}</p>}
        <div className="mt-1.5 flex gap-2 text-[10px] font-bold">
          <span className="rounded bg-carb-soft px-1.5 py-0.5 text-carb">탄 {meal.carbG}g</span>
          <span className="rounded bg-protein-soft px-1.5 py-0.5 text-protein">단 {meal.proteinG}g</span>
          <span className="rounded bg-fat-soft px-1.5 py-0.5 text-fat">지 {meal.fatG}g</span>
        </div>
      </div>
    </Card>
  )
}

/** ISO instant → 로컬 HH:MM */
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}

/** YYYY-MM-DD → "8월 10일 (월)", 오늘이면 "오늘, …" 접두 */
function formatDateLabel(date: string, today: string): string {
  const d = new Date(`${date}T12:00:00Z`)
  const md = d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', timeZone: 'UTC' })
  const wd = d.toLocaleDateString('ko-KR', { weekday: 'short', timeZone: 'UTC' })
  const label = `${md} (${wd})`
  return date === today ? `오늘, ${label}` : label
}

function Chevron({ dir, small = false }: { dir: 'left' | 'right'; small?: boolean }) {
  const s = small ? 14 : 20
  return (
    <svg aria-hidden="true" width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {dir === 'left' ? <path d="M15 6l-6 6 6 6" /> : <path d="M9 6l6 6-6 6" />}
    </svg>
  )
}
