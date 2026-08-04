import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from './useAuth'

/** 인증 가드: 미로그인 → /login, 온보딩 미완료 → /onboarding 강제 (완료자는 /onboarding 접근 시 홈으로) */
export function RequireAuth() {
  const { state } = useAuth()
  const location = useLocation()

  if (state.status === 'loading') {
    return <p>불러오는 중…</p>
  }
  if (state.status === 'guest') {
    return <Navigate to="/login" replace />
  }

  const onboardingIncomplete = !state.member.onboardingCompleted
  if (onboardingIncomplete && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }
  if (!onboardingIncomplete && location.pathname === '/onboarding') {
    return <Navigate to="/" replace />
  }
  return <Outlet />
}
