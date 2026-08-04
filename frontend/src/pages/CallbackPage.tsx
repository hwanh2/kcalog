import { Navigate } from 'react-router'
import { landingPathFor } from '../auth/landingPath'
import { useAuth } from '../auth/useAuth'

/**
 * OAuth 성공 리다이렉트 착지점. refresh 호출은 AuthProvider 부트스트랩이 담당하므로
 * 여기서는 그 결과만 보고 분기한다 (직접 호출하면 회전 방식 특성상 이중 refresh 경합이 생긴다).
 */
export function CallbackPage() {
  const { state } = useAuth()

  if (state.status === 'loading') {
    return <p>로그인 중…</p>
  }
  if (state.status === 'guest') {
    return <Navigate to="/login?error=session" replace />
  }
  return <Navigate to={landingPathFor(state.member)} replace />
}
