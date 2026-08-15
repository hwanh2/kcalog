import { screen } from '@testing-library/react'
import { Route } from 'react-router'
import { describe, expect, it } from 'vitest'
import { makeMember, renderWithAuth } from '../test/utils'
import type { AuthState } from './context'
import { RequireAuth } from './RequireAuth'

function renderAt(path: string, state: AuthState) {
  renderWithAuth(
    <>
      <Route path="/login" element={<div>로그인 화면</div>} />
      <Route element={<RequireAuth />}>
        <Route path="/app" element={<div>홈 화면</div>} />
        <Route path="/app/onboarding" element={<div>온보딩 화면</div>} />
      </Route>
    </>,
    { state, path },
  )
}

const incomplete = makeMember({ onboardingCompleted: false })
const completed = makeMember({ onboardingCompleted: true, dailyKcalTarget: 1930 })

describe('RequireAuth 가드', () => {
  it('세션 복구 중에는 로딩 표시만 보여준다', () => {
    renderAt('/app', { status: 'loading', member: null })
    expect(screen.getByText('불러오는 중…')).toBeInTheDocument()
  })

  it('미로그인 사용자는 로그인 화면으로 보낸다', () => {
    renderAt('/app', { status: 'guest', member: null })
    expect(screen.getByText('로그인 화면')).toBeInTheDocument()
  })

  it('온보딩 미완료 사용자가 홈에 접근하면 온보딩 화면으로 강제 이동한다', () => {
    renderAt('/app', { status: 'authed', member: incomplete })
    expect(screen.getByText('온보딩 화면')).toBeInTheDocument()
  })

  it('온보딩 미완료 사용자는 온보딩 화면에 머무를 수 있다', () => {
    renderAt('/app/onboarding', { status: 'authed', member: incomplete })
    expect(screen.getByText('온보딩 화면')).toBeInTheDocument()
  })

  it('온보딩 완료 사용자가 온보딩 화면에 접근하면 홈으로 보낸다', () => {
    renderAt('/app/onboarding', { status: 'authed', member: completed })
    expect(screen.getByText('홈 화면')).toBeInTheDocument()
  })

  it('온보딩 완료 사용자는 홈에 접근할 수 있다', () => {
    renderAt('/app', { status: 'authed', member: completed })
    expect(screen.getByText('홈 화면')).toBeInTheDocument()
  })
})
