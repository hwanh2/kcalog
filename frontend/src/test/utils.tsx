import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
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
    goal: null,
    targetWeightKg: null,
    dailyKcalTarget: null,
    latestWeightKg: null,
    muscleGoal: false,
    onboardingCompleted: false,
    // 기본값을 true로 두는 이유: false면 셸을 그리는 모든 테스트 위에 앱 둘러보기가 덮인다.
    // 둘러보기를 보는 테스트만 false로 덮어쓴다
    tutorialCompleted: true,
    ...overrides,
  }
}

/** QueryClient + AuthContext + MemoryRouter + Routes 공통 셸 — routes에는 <Route> 목록을 넘긴다.
 *  반환된 reloadMember/signOut 목으로 호출 여부를 검증할 수 있다.
 *
 *  QueryClientProvider가 여기 있는 이유: 실제 App.tsx도 셸 전체를 감싸고 있고, 셸이
 *  당겨서 새로고침으로 클라이언트를 쓴다. 감싸지 않으면 셸을 그리는 것만으로 터진다. */
export function renderWithAuth(
  routes: ReactNode,
  { state, path }: { state: AuthState; path: string },
) {
  const reloadMember = vi.fn().mockResolvedValue(undefined)
  const signOut = vi.fn().mockResolvedValue(undefined)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <AuthContext value={{ state, reloadMember, signOut }}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>{routes}</Routes>
        </MemoryRouter>
      </AuthContext>
    </QueryClientProvider>,
  )
  return { reloadMember, signOut }
}
