import { createContext } from 'react'
import type { MemberResponse } from '../api/member'

export type AuthState =
  | { status: 'loading'; member: null }
  | { status: 'guest'; member: null }
  | { status: 'authed'; member: MemberResponse }

export interface AuthContextValue {
  state: AuthState
  /** me 재조회 — 온보딩 완료·프로필 수정 후 최신 상태 반영용 */
  reloadMember: () => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
