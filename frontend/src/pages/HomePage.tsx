import { useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../auth/useAuth'
import { getBriefing } from '../api/coach'
import { getDashboard } from '../api/dashboard'
import { getMeals } from '../api/meal'
import type { Meal } from '../api/meal'
import { getWeights } from '../api/weight'
import { CalorieRing } from '../features/dashboard/CalorieRing'
import { MacroProgress } from '../features/dashboard/MacroProgress'
import { WeightMiniCard } from '../features/dashboard/WeightMiniCard'
import { MEAL_TYPE_LABELS, defaultMealType, sortByMealOrder } from '../features/meal/mealDefaults'
import { addDays, todayServiceDate } from '../lib/date'
import { AuthImage } from '../ui/AuthImage'
import { Card } from '../ui/form'
import { UtensilsIcon } from '../ui/icons'

/** 홈(오늘) — 날짜 이동 + 칼로리 링·탄단지 달성도·체중 미니카드·오늘 식사 목록·촬영 유도 (v2 목업 기준) */
export function HomePage() {
  // 섭취 집계는 05시에 하루가 바뀐다 — 새벽에 열어도 방금 담은 야식이 보이도록(백엔드 ServiceDay와 동일)
  const today = todayServiceDate()
  const [date, setDate] = useState(today)
  const { state } = useAuth()
  const targetWeightKg = state.status === 'authed' ? state.member.targetWeightKg : null

  const dashboard = useQuery({ queryKey: ['dashboard', date], queryFn: () => getDashboard(date) })
  const meals = useQuery({ queryKey: ['meals', date], queryFn: () => getMeals(date) })
  const weights = useQuery({
    queryKey: ['weights', addDays(date, -29), date],
    queryFn: () => getWeights(addDays(date, -29), date),
  })

  return (
    <section>
      <Greeting date={date} today={today} onChange={setDate} />

      {/* 인사말과 첫 카드는 붙이고, 카드끼리는 넉넉히 띄운다 */}
      <div className="mt-2 space-y-4">
        {dashboard.isError && (
          <p className="text-danger">대시보드를 불러오지 못했어요. 잠시 후 다시 시도해주세요.</p>
        )}

        {dashboard.data && (
          <Card>
            <CoachHeader withCoaching={date === today} />
            <div className="mt-3">
              <CalorieRing
                totalKcal={dashboard.data.totalKcal}
                dailyKcalTarget={dashboard.data.dailyKcalTarget}
                remainingKcal={dashboard.data.remainingKcal}
              />
            </div>
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

        {date === today && <CoachCard />}

        <WeightMiniCard entries={weights.data ?? []} targetWeightKg={targetWeightKg} />

        <MealSection meals={meals.data ?? []} date={date} today={today} />
      </div>
    </section>
  )
}

/** 상단 인사말 — 날짜(오늘, 8월 11일 (화)) + 시간대 인사 + 날짜 선택 캘린더 */
function Greeting({
  date,
  today,
  onChange,
}: {
  date: string
  today: string
  onChange: (d: string) => void
}) {
  const { state } = useAuth()
  const nickname = state.status === 'authed' ? state.member.nickname : ''
  return (
    <div className="-mt-1 flex items-start justify-between">
      <div className="min-w-0 leading-tight">
        <p className="text-xs text-muted">{formatDateLabel(date, today)}</p>
        <h1 className="text-[15px] font-medium text-ink">
          {timeGreeting()}, {givenName(nickname)}님
        </h1>
      </div>
      {/* 캘린더 아이콘 위에 네이티브 날짜 선택을 덮어, 탭하면 그 자리에서 달력이 열린다 */}
      <div className="relative shrink-0 rounded-lg p-1 text-muted">
        <CalendarIcon />
        <input
          type="date"
          aria-label="날짜 선택"
          value={date}
          max={today}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          /* h-full w-full — inset-0만 두면 WebKit이 날짜 입력의 고유 폭(≈150px)을 그대로 써서
             28px짜리 아이콘 칸 밖으로 100px 넘게 삐져나온다. 투명하니 보이지는 않지만
             문서가 그만큼 넓어져 홈 전체가 좌우로 끌려간다(design D23).
             음식기록 날짜 머리(RecordsDateHeader)도 같은 이유로 폭을 못 박는다 */
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
    </div>
  )
}

/** 성을 뗀 이름 — 한글 이름(2~4자)이면 첫 글자(1음절 성)를 떼고, 그 외(닉네임·영문)는 그대로 */
function givenName(nickname: string): string {
  return /^[가-힣]{2,4}$/.test(nickname) ? nickname.slice(1) : nickname
}

/** 시간대별 인사 (KST 기준) */
function timeGreeting(): string {
  const hour = kstHour()
  if (hour >= 5 && hour < 11) return '좋은 아침이에요'
  if (hour >= 11 && hour < 17) return '안녕하세요'
  if (hour >= 17 && hour < 21) return '좋은 저녁이에요'
  return '좋은 밤이에요'
}

function kstHour(): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(new Date())
  return Number(parts.find((p) => p.type === 'hour')?.value ?? '0') % 24
}

/** 오늘의 AI 코칭 카드 — 브리핑 본문을 초록 카드로, 탭하면 AI PT로 이동. 데이터 없으면 숨김 */
function CoachCard() {
  const { data: briefing } = useQuery({ queryKey: ['coachBriefing'], queryFn: getBriefing })
  if (!briefing?.hasData) return null
  return (
    <Link
      to="/app/ai-pt"
      className="flex items-center gap-3 rounded-2xl bg-success-soft px-4 py-3.5"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-success text-lg">
        ✨
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-ink">오늘의 AI 코칭</p>
        <p className="mt-0.5 text-sm text-ink/80">{briefing.message}</p>
      </div>
      <span className="shrink-0 text-muted" aria-hidden>›</span>
    </Link>
  )
}

/** 오늘의 칼로리 헤더 — 칼로리 카드 상단. 코칭 한 줄(오늘·데이터 있을 때)과 리포트 바로가기. */
function CoachHeader({ withCoaching }: { withCoaching: boolean }) {
  const { data: briefing } = useQuery({ queryKey: ['coachBriefing'], queryFn: getBriefing })
  const headline = withCoaching && briefing?.hasData ? briefing.headline : ''
  return (
    <div className="flex items-center justify-between">
      <div className="min-w-0">
        <p className="text-sm font-bold text-ink">오늘의 칼로리</p>
        {headline && <p className="truncate text-xs font-medium text-success">{headline}</p>}
      </div>
      <Link to="/app/report" className="flex shrink-0 items-center gap-0.5 text-sm font-semibold text-brand-ink">
        리포트 <span aria-hidden>›</span>
      </Link>
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

function MealSection({ meals, date, today }: { meals: Meal[]; date: string; today: string }) {
  // 음식기록 탭이 쓰는 것과 **같은 기준**이어야 한다 — 홈이 "아침"이라 해놓고 넘어간 화면이
  // "저녁"에 가 있으면 안 된다(design D1). 그래서 기록 이력이 아니라 시각으로 정한다.
  const nextType = defaultMealType(new Date())
  // 보고 있는 날짜를 함께 실어 보낸다 — 안 보내면 기록 화면이 늘 오늘로 열려 두 화면이 다른 날을 본다.
  // 오늘이면 붙이지 않는다: 기록 화면의 기본값이 오늘이라 주소만 길어진다(design D21)
  const dateParam = date === today ? '' : `&date=${date}`

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-extrabold">{date === today ? '오늘' : '이 날'} 기록한 식사</h2>
        <Link
          to={`/app/records${dateParam ? `?date=${date}` : ''}`}
          className="flex items-center gap-0.5 text-xs font-bold text-brand-ink"
        >
          전체보기
          <Chevron dir="right" small />
        </Link>
      </div>

      {meals.length === 0 && (
        <p className="px-1 text-muted">{date === today ? '오늘' : '이 날'} 기록한 식사가 없어요.</p>
      )}

      {/* 아침부터 — 서버 순서(저장 시각)로는 뒤늦게 채운 아침이 저녁 아래로 간다 */}
      {sortByMealOrder(meals).map((meal) => (
        <MealCard key={meal.id} meal={meal} />
      ))}

      {/* 카메라 FAB과 같은 경로 — 등록 경로는 음식기록 탭 하나로 모여 있다.
          예전 `/meals/new`는 App.tsx에 없는 라우트라 눌러도 화면만 비었다.

          끼니를 쿼리로 실어 보낸다 — 양쪽이 각자 `new Date()`를 보면 끼니 경계를 사이에 두고
          갈린다(14:59 렌더 → 15:01 클릭이면 홈은 "점심", 도착 화면은 "저녁").
          **카드에 적힌 끼니가 곧 저장될 끼니여야 한다**(design D1) */}
      <Link
        to={`/app/records?camera=1&meal=${nextType}${dateParam}`}
        className="flex items-center justify-between rounded-card border-2 border-dashed border-border bg-canvas/60 p-3.5"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface text-muted">+</span>
          <span>
            <span className="block text-xs font-bold">{MEAL_TYPE_LABELS[nextType]} 촬영 및 기록</span>
            <span className="block text-[10px] text-muted">카메라로 찍으면 AI가 탄단지 자동 계산</span>
          </span>
        </span>
        <span className="rounded-lg bg-surface px-2.5 py-1 text-xs font-bold text-brand-ink shadow-sm">기록하기</span>
      </Link>
    </div>
  )
}

function MealCard({ meal }: { meal: Meal }) {
  const names = meal.items.map((it) => it.name).join(' · ')
  return (
    <Card className="flex items-center gap-3">
      {meal.imageUrl ? (
        <AuthImage src={meal.imageUrl} alt="식사 사진" className="h-14 w-14 shrink-0 rounded-tile object-cover" />
      ) : (
        // 사진 없이 담은 기록도 같은 자리를 차지한다 — 빈 칸으로 두면 줄마다 글자 시작점이 어긋난다.
        // 아이콘은 음식기록 탭과 같은 식기 아이콘(DESIGN.md 5 — 같은 뜻에는 같은 아이콘)
        <span
          aria-hidden
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-tile bg-canvas text-muted"
        >
          <UtensilsIcon size={22} />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          {/* 홈은 여러 끼니가 한 목록에 섞이는 유일한 자리다 — 10px 회색 글씨로는 어느 끼니인지
              훑어지지 않아 칩으로 세운다. 목록이 끼니 순서로 정렬돼 있어 칩만으로 구분된다 */}
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-bold text-brand-ink">
              {MEAL_TYPE_LABELS[meal.mealType]}
            </span>
            <span className="truncate text-[10px] font-medium text-muted">{formatTime(meal.eatenAt)}</span>
          </span>
          <span className="text-xs font-black">{meal.totalKcal} kcal</span>
        </div>
        {names && <p className="mt-0.5 truncate text-xs font-bold">{names}</p>}
        <div className="mt-1.5 flex gap-2 text-[10px] font-bold">
          <span className="rounded bg-carb-soft px-1.5 py-0.5 text-carb-ink">탄 {meal.carbG}g</span>
          <span className="rounded bg-protein-soft px-1.5 py-0.5 text-protein-ink">단 {meal.proteinG}g</span>
          <span className="rounded bg-fat-soft px-1.5 py-0.5 text-fat-ink">지 {meal.fatG}g</span>
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
