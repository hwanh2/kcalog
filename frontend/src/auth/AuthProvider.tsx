import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { onSessionLost, refreshAccessToken } from '../api/client'
import { logout } from '../api/auth'
import { getMe } from '../api/member'
import { IS_TOSS } from '../platform'
import { AuthContext } from './context'
import type { AuthState } from './context'

const GUEST: AuthState = { status: 'guest', member: null }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading', member: null })
  const [attempt, setAttempt] = useState(0)

  // 앱 부트스트랩: 세션 복구(웹은 refresh 쿠키, 토스는 익명 키 로그인) → 성공 시 me 조회
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
  }, [attempt])

  useEffect(() => {
    if (!IS_TOSS) return
    onSessionLost(() => setState(GUEST))
    return () => onSessionLost(null)
  }, [])

  const reloadMember = useCallback(async () => {
    const member = await getMe()
    setState({ status: 'authed', member })
  }, [])

  const signOut = useCallback(async () => {
    await logout()
    setState(GUEST)
  }, [])

  const retrySession = useCallback(() => {
    setState({ status: 'loading', member: null })
    setAttempt((n) => n + 1)
  }, [])

  const value = useMemo(
    () => ({ state, reloadMember, signOut, retrySession }),
    [state, reloadMember, signOut, retrySession],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
