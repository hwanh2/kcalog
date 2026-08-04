import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { refreshAccessToken } from '../api/client'
import { logout } from '../api/auth'
import { getMe } from '../api/member'
import { AuthContext } from './context'
import type { AuthState } from './context'

const GUEST: AuthState = { status: 'guest', member: null }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading', member: null })

  // 앱 부트스트랩: refresh 쿠키로 세션 복구 시도 → 성공 시 me 조회
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const token = await refreshAccessToken()
      if (!token) {
        if (!cancelled) setState(GUEST)
        return
      }
      try {
        const member = await getMe()
        if (!cancelled) setState({ status: 'authed', member })
      } catch {
        if (!cancelled) setState(GUEST)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const reloadMember = useCallback(async () => {
    const member = await getMe()
    setState({ status: 'authed', member })
  }, [])

  const signOut = useCallback(async () => {
    await logout()
    setState(GUEST)
  }, [])

  const value = useMemo(
    () => ({ state, reloadMember, signOut }),
    [state, reloadMember, signOut],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
