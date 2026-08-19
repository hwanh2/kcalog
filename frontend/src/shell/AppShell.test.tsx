import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { RequireAuth } from '../auth/RequireAuth'
import { makeMember, renderWithAuth } from '../test/utils'
import { AppShell } from './AppShell'

vi.mock('../api/coach', () => ({
  getPraise: vi.fn(() => Promise.resolve({ praise: null })),
  dismissPraise: vi.fn(),
}))

const completed = { status: 'authed' as const, member: makeMember({ onboardingCompleted: true }) }

/** RequireAuth → AppShell 중첩 라우트를 그대로 재현 (온보딩은 셸 밖) */
function shellRoutes() {
  return (
    <>
      <Route path="/app/onboarding" element={<div>온보딩 화면</div>} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/app/profile" element={<div>프로필 화면</div>} />
          <Route path="/app" element={<div>홈 화면</div>} />
          <Route path="/app/records" element={<div>음식기록 화면</div>} />
          <Route path="/app/weight" element={<div>체중 화면</div>} />
          <Route path="/app/report" element={<div>리포트 화면</div>} />
          <Route path="/app/ai-pt" element={<div>AI PT 화면</div>} />
        </Route>
      </Route>
    </>
  )
}

describe('AppShell', () => {
  it('5탭과 코치, 현재 화면을 함께 렌더한다', () => {
    renderWithAuth(shellRoutes(), { state: completed, path: '/app' })

    expect(screen.getByText('홈 화면')).toBeInTheDocument()
    for (const name of ['홈', '음식기록', '체중', '리포트', 'AI PT']) {
      expect(screen.getByRole('link', { name })).toBeInTheDocument()
    }
    expect(screen.getByRole('link', { name: 'AI 코치' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /프로필/ })).toBeInTheDocument()
  })

  it('헤더는 서비스명 한 줄 — 부제는 모든 화면 맨 위를 상시로 차지했다', () => {
    renderWithAuth(shellRoutes(), { state: completed, path: '/app' })

    expect(screen.getByText('kcalog')).toBeInTheDocument()
    expect(screen.queryByText('AI 식단 · 탄단지 코칭')).not.toBeInTheDocument()
    expect(screen.queryByText(/\.ai/)).not.toBeInTheDocument()
  })

  it('음식기록 탭에서는 코치를 숨긴다 — 고정 버튼이 기록 화면을 가린다', () => {
    renderWithAuth(shellRoutes(), { state: completed, path: '/app/records' })

    expect(screen.getByText('음식기록 화면')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'AI 코치' })).not.toBeInTheDocument()
  })

  it('AI PT 탭에서도 코치를 숨긴다 — 이미 그 화면이다', () => {
    renderWithAuth(shellRoutes(), { state: completed, path: '/app/ai-pt' })

    expect(screen.getByText('AI PT 화면')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'AI 코치' })).not.toBeInTheDocument()
  })

  it('프로필 화면에서는 프로필 아이콘을 감춘다 — 이미 그 화면이다', () => {
    renderWithAuth(shellRoutes(), { state: completed, path: '/app/profile' })

    expect(screen.getByText('프로필 화면')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '프로필' })).not.toBeInTheDocument()
    // 헤더 자체는 남는다 — 서비스명과 하단 탭으로 나갈 길이 있어야 한다
    expect(screen.getByText('kcalog')).toBeInTheDocument()
  })

  it('음식기록 탭에서는 헤더도 숨긴다 — 그 화면은 끼니 탭이 첫 줄이다', () => {
    renderWithAuth(shellRoutes(), { state: completed, path: '/app/records' })

    expect(screen.queryByText('kcalog')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /프로필/ })).not.toBeInTheDocument()
    // 하단 탭은 그대로 — 다른 화면으로 나갈 길은 남아 있어야 한다
    expect(screen.getByRole('link', { name: '홈' })).toBeInTheDocument()
  })

  it('화면을 옮기면 맨 위에서 시작한다 — 긴 홈에서 내려간 자리가 그대로 따라오면 안 된다', async () => {
    const user = userEvent.setup()
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    renderWithAuth(shellRoutes(), { state: completed, path: '/app' })

    scrollTo.mockClear()
    await user.click(screen.getByRole('link', { name: '음식기록' }))

    expect(scrollTo).toHaveBeenCalledWith(0, 0)
    scrollTo.mockRestore()
  })

  it('탭을 누르면 서버 요청 없이 해당 화면으로 전환된다', async () => {
    const user = userEvent.setup()
    renderWithAuth(shellRoutes(), { state: completed, path: '/app' })

    await user.click(screen.getByRole('link', { name: '음식기록' }))
    expect(screen.getByText('음식기록 화면')).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: '체중' }))
    expect(screen.getByText('체중 화면')).toBeInTheDocument()
  })

  it('탭을 누르면 진동을 시도한다 — 화면이 바뀌기 전에 닿았다는 답이 와야 한다', async () => {
    const vibrate = vi.fn(() => true)
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true })
    try {
      const user = userEvent.setup()
      renderWithAuth(shellRoutes(), { state: completed, path: '/app' })

      await user.click(screen.getByRole('link', { name: '음식기록' }))

      expect(vibrate).toHaveBeenCalled()
    } finally {
      delete (navigator as { vibrate?: unknown }).vibrate
    }
  })

  it('탭에 누름 반응이 붙어 있다 — 아이폰에서는 진동이 안 오므로 이것만 남는다', () => {
    renderWithAuth(shellRoutes(), { state: completed, path: '/app' })

    for (const name of ['홈', '음식기록', '체중', '리포트', 'AI PT']) {
      expect(screen.getByRole('link', { name })).toHaveClass('press')
    }
  })

  it('코치를 누르면 AI PT 탭으로 이동한다', async () => {
    const user = userEvent.setup()
    renderWithAuth(shellRoutes(), { state: completed, path: '/app/weight' })

    const fab = screen.getByRole('link', { name: 'AI 코치' })
    expect(fab).toHaveAttribute('href', '/app/ai-pt')

    await user.click(fab)
    expect(screen.getByText('AI PT 화면')).toBeInTheDocument()
  })

  it('AI PT 탭으로 전환된다', async () => {
    const user = userEvent.setup()
    renderWithAuth(shellRoutes(), { state: completed, path: '/app' })

    await user.click(screen.getByRole('link', { name: 'AI PT' }))
    expect(screen.getByText('AI PT 화면')).toBeInTheDocument()
  })

  it('현재 탭에 aria-current가 설정된다', () => {
    renderWithAuth(shellRoutes(), { state: completed, path: '/app/weight' })
    expect(screen.getByRole('link', { name: '체중' })).toHaveAttribute('aria-current', 'page')
  })

  it('온보딩 미완료 회원은 셸 대신 온보딩 화면으로 강제된다', () => {
    renderWithAuth(shellRoutes(), {
      state: { status: 'authed', member: makeMember({ onboardingCompleted: false }) },
      path: '/app',
    })

    expect(screen.getByText('온보딩 화면')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '홈' })).not.toBeInTheDocument()
  })
})
