import { render } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, Routes } from 'react-router'
import { vi } from 'vitest'
import type { MemberResponse } from '../api/member'
import { AuthContext } from '../auth/context'
import type { AuthState } from '../auth/context'

/** MemberResponse 픽스처의 단일 출처 — 필요한 필드만 overrides로 덮어쓴다 */
export function makeMember(overrides: Partial<MemberResponse> = {}): MemberResponse {
  return {
    id: 1,
    nickname: '테스터',
    email: null,
    gender: null,
    birthYear: null,
    heightCm: null,
    activityLevel: null,
    targetWeightKg: null,
    dailyKcalTarget: null,
    latestWeightKg: null,
    onboardingCompleted: false,
    ...overrides,
  }
}

/** AuthContext + MemoryRouter + Routes 공통 셸 — routes에는 <Route> 목록을 넘긴다 */
export function renderWithAuth(routes: ReactNode, { state, path }: { state: AuthState; path: string }) {
  return render(
    <AuthContext value={{ state, reloadMember: vi.fn(), signOut: vi.fn() }}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>{routes}</Routes>
      </MemoryRouter>
    </AuthContext>,
  )
}
