import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route } from 'react-router'
import { describe, expect, it } from 'vitest'
import { RequireAuth } from '../auth/RequireAuth'
import { ComingSoonPage } from '../pages/ComingSoonPage'
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
          <Route path="/" element={<div>홈 화면</div>} />
          <Route path="/records" element={<div>음식기록 화면</div>} />
          <Route path="/weight" element={<div>체중 화면</div>} />
          <Route path="/report" element={<div>리포트 화면</div>} />
          <Route path="/ai-pt" element={<ComingSoonPage title="AI PT" />} />
          <Route path="/meals/new" element={<div>촬영 화면</div>} />
        </Route>
      </Route>
    </>
  )
}

describe('AppShell', () => {
  it('5탭·카메라 FAB과 현재 화면을 함께 렌더한다', () => {
    renderWithAuth(shellRoutes(), { state: completed, path: '/' })

    expect(screen.getByText('홈 화면')).toBeInTheDocument()
    for (const name of ['홈', '음식기록', '체중', '리포트', 'AI PT']) {
      expect(screen.getByRole('link', { name })).toBeInTheDocument()
    }
    expect(screen.getByRole('link', { name: '식사 촬영' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /프로필/ })).toBeInTheDocument()
  })

  it('촬영 화면에서는 카메라 FAB을 숨긴다', () => {
    renderWithAuth(shellRoutes(), { state: completed, path: '/meals/new' })

    expect(screen.getByText('촬영 화면')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '식사 촬영' })).not.toBeInTheDocument()
  })

  it('탭을 누르면 서버 요청 없이 해당 화면으로 전환된다', async () => {
    const user = userEvent.setup()
    renderWithAuth(shellRoutes(), { state: completed, path: '/' })

    await user.click(screen.getByRole('link', { name: '음식기록' }))
    expect(screen.getByText('음식기록 화면')).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: '체중' }))
    expect(screen.getByText('체중 화면')).toBeInTheDocument()
  })

  it('카메라 FAB을 누르면 식사 촬영 흐름으로 진입한다', async () => {
    const user = userEvent.setup()
    renderWithAuth(shellRoutes(), { state: completed, path: '/weight' })

    await user.click(screen.getByRole('link', { name: '식사 촬영' }))
    expect(screen.getByText('촬영 화면')).toBeInTheDocument()
  })

  it('준비 중 탭(AI PT)은 안내 화면을 표시한다', async () => {
    const user = userEvent.setup()
    renderWithAuth(shellRoutes(), { state: completed, path: '/' })

    await user.click(screen.getByRole('link', { name: 'AI PT' }))
    expect(screen.getByRole('heading', { name: 'AI PT' })).toBeInTheDocument()
  })

  it('현재 탭에 aria-current가 설정된다', () => {
    renderWithAuth(shellRoutes(), { state: completed, path: '/weight' })
    expect(screen.getByRole('link', { name: '체중' })).toHaveAttribute('aria-current', 'page')
  })

  it('온보딩 미완료 회원은 셸 대신 온보딩 화면으로 강제된다', () => {
    renderWithAuth(shellRoutes(), {
      state: { status: 'authed', member: makeMember({ onboardingCompleted: false }) },
      path: '/',
    })

    expect(screen.getByText('온보딩 화면')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '홈' })).not.toBeInTheDocument()
  })
})
