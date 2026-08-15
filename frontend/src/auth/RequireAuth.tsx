import { Navigate, Outlet, useLocation } from 'react-router'
import { landingPathFor, ONBOARDING_PATH } from './landingPath'
import { useAuth } from './useAuth'

/** 인증 가드: 미로그인 → /login, 온보딩 미완료 → /app/onboarding 강제 (완료자는 온보딩 접근 시 홈으로) */
export function RequireAuth() {
  const { state } = useAuth()
  const location = useLocation()

  if (state.status === 'loading') {
    return <p>불러오는 중…</p>
  }
  if (state.status === 'guest') {
    return <Navigate to="/login" replace />
  }

  // 미완료자는 /onboarding에만, 완료자는 /onboarding 밖에만 있을 수 있다 — 어긋나면 착지 경로로
  const landing = landingPathFor(state.member)
  const misplaced =
    (!state.member.onboardingCompleted && location.pathname !== ONBOARDING_PATH) ||
    (state.member.onboardingCompleted && location.pathname === ONBOARDING_PATH)
  if (misplaced) {
    return <Navigate to={landing} replace />
  }
  return <Outlet />
}
