import { Link } from 'react-router'
import { useAuth } from '../auth/useAuth'

/** 홈 자리표시자 — 일일 목표만 표시. 대시보드(칼로리 링·타임라인)는 후속 변경에서 구현 */
export function HomePage() {
  const { state } = useAuth()
  if (state.status !== 'authed') return null

  return (
    <main>
      <h1>오늘</h1>
      <p>
        {state.member.nickname}님의 일일 칼로리 목표: <strong>{state.member.dailyKcalTarget} kcal</strong>
      </p>
      <Link to="/profile">프로필</Link>
    </main>
  )
}
