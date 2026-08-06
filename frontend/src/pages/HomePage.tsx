import { useAuth } from '../auth/useAuth'
import { Card } from '../ui/form'

/** 오늘 탭 자리표시자 — 대시보드(잔여 칼로리·타임라인)와 카메라 진입점은 후속 태스크에서 구현 */
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
    </section>
  )
}
