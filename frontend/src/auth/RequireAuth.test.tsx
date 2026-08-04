import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { MemberResponse } from '../api/member'
import { AuthContext } from './context'
import type { AuthState } from './context'
import { RequireAuth } from './RequireAuth'

function member(onboardingCompleted: boolean): MemberResponse {
  return {
    id: 1,
    nickname: '테스터',
    email: null,
    gender: null,
    birthYear: null,
    heightCm: null,
    activityLevel: null,
    targetWeightKg: null,
    dailyKcalTarget: onboardingCompleted ? 1930 : null,
    latestWeightKg: null,
    onboardingCompleted,
  }
}

function renderAt(path: string, state: AuthState) {
  render(
    <AuthContext value={{ state, reloadMember: vi.fn(), signOut: vi.fn() }}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<div>로그인 화면</div>} />
          <Route element={<RequireAuth />}>
            <Route path="/" element={<div>홈 화면</div>} />
            <Route path="/onboarding" element={<div>온보딩 화면</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext>,
  )
}

describe('RequireAuth 가드', () => {
  it('세션 복구 중에는 로딩 표시만 보여준다', () => {
    renderAt('/', { status: 'loading', member: null })
    expect(screen.getByText('불러오는 중…')).toBeInTheDocument()
  })

  it('미로그인 사용자는 로그인 화면으로 보낸다', () => {
    renderAt('/', { status: 'guest', member: null })
    expect(screen.getByText('로그인 화면')).toBeInTheDocument()
  })

  it('온보딩 미완료 사용자가 홈에 접근하면 온보딩 화면으로 강제 이동한다', () => {
    renderAt('/', { status: 'authed', member: member(false) })
    expect(screen.getByText('온보딩 화면')).toBeInTheDocument()
  })

  it('온보딩 미완료 사용자는 온보딩 화면에 머무를 수 있다', () => {
    renderAt('/onboarding', { status: 'authed', member: member(false) })
    expect(screen.getByText('온보딩 화면')).toBeInTheDocument()
  })

  it('온보딩 완료 사용자가 온보딩 화면에 접근하면 홈으로 보낸다', () => {
    renderAt('/onboarding', { status: 'authed', member: member(true) })
    expect(screen.getByText('홈 화면')).toBeInTheDocument()
  })

  it('온보딩 완료 사용자는 홈에 접근할 수 있다', () => {
    renderAt('/', { status: 'authed', member: member(true) })
    expect(screen.getByText('홈 화면')).toBeInTheDocument()
  })
})
