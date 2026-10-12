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
  /** 세션 복구를 처음부터 다시 한다. 로그인 화면이 없는 토스 빌드의 다시 시도 버튼이 쓴다 */
  retrySession: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
