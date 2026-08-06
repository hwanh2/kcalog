import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route } from 'react-router'
import { describe, expect, it } from 'vitest'
import { RequireAuth } from '../auth/RequireAuth'
import { makeMember, renderWithAuth } from '../test/utils'
import { AppShell } from './AppShell'

const completed = { status: 'authed' as const, member: makeMember({ onboardingCompleted: true }) }

/** RequireAuth → AppShell 중첩 라우트를 그대로 재현 (온보딩은 셸 밖) */
function shellRoutes() {
  return (
    <>
      <Route path="/onboarding" element={<div>온보딩 화면</div>} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<div>오늘 화면</div>} />
          <Route path="/records" element={<div>기록 화면</div>} />
          <Route path="/profile" element={<div>프로필 화면</div>} />
        </Route>
      </Route>
    </>
  )
}

describe('AppShell', () => {
  it('3탭과 현재 화면을 함께 렌더한다', () => {
    renderWithAuth(shellRoutes(), { state: completed, path: '/' })

    expect(screen.getByText('오늘 화면')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '오늘' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '기록' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '프로필' })).toBeInTheDocument()
  })

  it('탭을 누르면 서버 요청 없이 해당 화면으로 전환된다', async () => {
    const user = userEvent.setup()
    renderWithAuth(shellRoutes(), { state: completed, path: '/' })

    await user.click(screen.getByRole('link', { name: '기록' }))
    expect(screen.getByText('기록 화면')).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: '프로필' }))
    expect(screen.getByText('프로필 화면')).toBeInTheDocument()
  })

  it('현재 탭에 aria-current가 설정된다', () => {
    renderWithAuth(shellRoutes(), { state: completed, path: '/profile' })
    expect(screen.getByRole('link', { name: '프로필' })).toHaveAttribute('aria-current', 'page')
  })

  it('온보딩 미완료 회원은 셸 대신 온보딩 화면으로 강제된다', () => {
    renderWithAuth(shellRoutes(), {
      state: { status: 'authed', member: makeMember({ onboardingCompleted: false }) },
      path: '/',
    })

    expect(screen.getByText('온보딩 화면')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '오늘' })).not.toBeInTheDocument()
  })
})
