import { screen } from '@testing-library/react'
import { Route } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { RequireAuth } from '../auth/RequireAuth'
import { ProfilePage } from '../pages/ProfilePage'
import { makeMember, renderWithAuth } from '../test/utils'
import { AppShell } from './AppShell'

vi.mock('../platform', () => ({ IS_TOSS: true, loadToss: vi.fn() }))
vi.mock('../api/coach', () => ({
  getPraise: vi.fn(() => Promise.resolve({ praise: null })),
  dismissPraise: vi.fn(),
}))
vi.mock('../api/dashboard', () => ({ getDashboard: vi.fn(() => new Promise(() => {})) }))
vi.mock('../api/report', () => ({ getReport: vi.fn(() => new Promise(() => {})) }))
vi.mock('../api/tdee', () => ({ getTdee: vi.fn(() => new Promise(() => {})) }))
vi.mock('../api/weight', () => ({ getWeightSummary: vi.fn(() => new Promise(() => {})) }))

const completed = {
  status: 'authed' as const,
  member: makeMember({ onboardingCompleted: true, dailyKcalTarget: 1930 }),
}

function shellRoutes() {
  return (
    <Route element={<RequireAuth />}>
      <Route element={<AppShell />}>
        <Route path="/app" element={<div>홈 화면</div>} />
        <Route path="/app/weight" element={<div>체중 화면</div>} />
        <Route path="/app/profile" element={<ProfilePage />} />
      </Route>
    </Route>
  )
}

describe('AppShell (토스 빌드)', () => {
  it('앱 헤더를 그리지 않는다. 로고와 프로필 진입은 토스 내비바가 맡는다', () => {
    renderWithAuth(shellRoutes(), { state: completed, path: '/app' })

    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
    expect(screen.queryByText('오늘식단')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '프로필' })).not.toBeInTheDocument()
  })

  it('탭 구성과 목적지는 웹과 같다', () => {
    renderWithAuth(shellRoutes(), { state: completed, path: '/app' })

    expect(screen.getByRole('link', { name: '체중' })).toHaveAttribute('href', '/app/weight')
    for (const name of ['홈', '음식기록', '리포트', 'AI PT']) {
      expect(screen.getByRole('link', { name })).toBeInTheDocument()
    }
  })

  it('프로필에 로그아웃 메뉴가 없다', () => {
    renderWithAuth(shellRoutes(), { state: completed, path: '/app/profile' })

    expect(screen.queryByRole('button', { name: '로그아웃' })).not.toBeInTheDocument()
  })
})
