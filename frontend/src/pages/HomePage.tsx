import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { getDashboard } from '../api/dashboard'
import type { Dashboard } from '../api/dashboard'
import { MEAL_TYPE_LABELS } from '../features/meal/mealDefaults'
import { todayLocalDate } from '../lib/date'
import { Card } from '../ui/form'

/** 오늘 탭 — 잔여 칼로리·탄단지·식사 타임라인 대시보드 + 식사 기록 진입 */
export function HomePage() {
  const date = todayLocalDate()
  const { data, isPending, isError } = useQuery({
    queryKey: ['dashboard', date],
    queryFn: () => getDashboard(date),
  })

  return (
    <section>
      <h1 className="text-xl font-semibold">오늘</h1>

      {isPending && <p className="mt-4 text-muted">불러오는 중…</p>}
      {isError && <p className="mt-4 text-danger">대시보드를 불러오지 못했어요. 잠시 후 다시 시도해주세요.</p>}
      {data && <Summary data={data} />}

      <Link
        to="/meals/new"
        className="mt-4 block rounded-md bg-brand py-3 text-center font-medium text-on-brand"
      >
        + 식사 기록
      </Link>
    </section>
  )
}

function Summary({ data }: { data: Dashboard }) {
  const { totalKcal, remainingKcal, dailyKcalTarget, carbG, proteinG, fatG, timeline } = data
  const over = remainingKcal !== null && remainingKcal < 0

  return (
    <>
      <Card className="mt-4">
        {remainingKcal !== null ? (
          <>
            <p className="text-muted">{over ? '목표 초과' : '남은 칼로리'}</p>
            <p className={`mt-1 text-3xl font-bold ${over ? 'text-danger' : 'text-brand'}`}>
              {Math.abs(remainingKcal)}
              <span className="ml-1 text-base font-normal text-muted">kcal</span>
            </p>
            <p className="mt-1 text-sm text-muted">
              섭취 {totalKcal} / 목표 {dailyKcalTarget} kcal
            </p>
          </>
        ) : (
          <>
            <p className="text-muted">오늘 섭취</p>
            <p className="mt-1 text-3xl font-bold text-brand">
              {totalKcal}
              <span className="ml-1 text-base font-normal text-muted">kcal</span>
            </p>
          </>
        )}

        <MacroBar carbG={carbG} proteinG={proteinG} fatG={fatG} />
      </Card>

      <h2 className="mt-6 text-sm font-medium text-muted">식사 타임라인</h2>
      {timeline.length === 0 ? (
        <p className="mt-2 text-muted">오늘 기록한 식사가 없어요.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {timeline.map((entry) => (
            <li key={entry.id}>
              <Card className="flex items-center justify-between gap-2">
                <span className="font-medium">{MEAL_TYPE_LABELS[entry.mealType]}</span>
                <span className="text-sm text-muted">{formatTime(entry.eatenAt)}</span>
                <span className="text-brand">{entry.totalKcal} kcal</span>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

/** 탄단지 gram 비율 막대 — 합계 0이면 렌더하지 않는다 */
function MacroBar({ carbG, proteinG, fatG }: { carbG: number; proteinG: number; fatG: number }) {
  const total = carbG + proteinG + fatG
  if (total <= 0) return null
  const pct = (v: number) => `${(v / total) * 100}%`
  return (
    <div className="mt-4">
      <div className="flex h-2 overflow-hidden rounded-full">
        <span className="bg-brand" style={{ width: pct(carbG) }} />
        <span className="bg-brand-dark" style={{ width: pct(proteinG) }} />
        <span className="bg-muted" style={{ width: pct(fatG) }} />
      </div>
      <p className="mt-1 text-sm text-muted">
        탄 {carbG} · 단 {proteinG} · 지 {fatG}
      </p>
    </div>
  )
}

/** ISO instant → 로컬 HH:MM */
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
}
