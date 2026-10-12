import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { renderWithAuth } from '../test/utils'
import { RequireAuth } from './RequireAuth'

vi.mock('../platform', () => ({ IS_TOSS: true, loadToss: vi.fn() }))

describe('RequireAuth 가드 (토스 빌드)', () => {
  it('세션 복구에 실패하면 로그인 화면 대신 다시 시도 화면을 보여준다', async () => {
    const { retrySession } = renderWithAuth(
      <>
        <Route path="/login" element={<div>로그인 화면</div>} />
        <Route element={<RequireAuth />}>
          <Route path="/app" element={<div>홈 화면</div>} />
        </Route>
      </>,
      { state: { status: 'guest', member: null }, path: '/app' },
    )

    expect(screen.queryByText('로그인 화면')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('연결이 잠시 끊겼어요')

    await userEvent.click(screen.getByRole('button', { name: '다시 시도' }))
    expect(retrySession).toHaveBeenCalledTimes(1)
  })
})
