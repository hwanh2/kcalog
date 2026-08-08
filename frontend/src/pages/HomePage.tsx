import { Link } from 'react-router'
import { useAuth } from '../auth/useAuth'
import { Card } from '../ui/form'

/** 오늘 탭 — 일일 목표 + 식사 기록 진입점. 대시보드(잔여 칼로리·타임라인)는 그룹 6에서 확장 */
export function HomePage() {
  const { state } = useAuth()
  if (state.status !== 'authed') return null

  return (
    <section>
      <h1 className="text-xl font-semibold">오늘</h1>
      <Card className="mt-4">
        <p className="text-muted">{state.member.nickname}님의 일일 칼로리 목표</p>
        <p className="mt-1 text-3xl font-bold text-brand">
          {state.member.dailyKcalTarget}
          <span className="ml-1 text-base font-normal text-muted">kcal</span>
        </p>
      </Card>

      <Link
        to="/meals/new"
        className="mt-4 block rounded-md bg-brand py-3 text-center font-medium text-on-brand"
      >
        + 식사 기록
      </Link>
    </section>
  )
}
