import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { dismissPraise, getPraise } from '../../api/coach'
import { CoachFab } from './CoachFab'

vi.mock('../../api/coach', () => ({
  getPraise: vi.fn(),
  dismissPraise: vi.fn(),
}))

const getPraiseMock = vi.mocked(getPraise)
const dismissPraiseMock = vi.mocked(dismissPraise)

function renderFab() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/app']}>
        <Routes>
          <Route path="/app" element={<CoachFab />} />
          <Route path="/app/ai-pt" element={<div>AI PT 화면</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  dismissPraiseMock.mockResolvedValue(undefined)
})

describe('코치 FAB', () => {
  it('칭찬이 없으면 얼굴만 보인다', async () => {
    getPraiseMock.mockResolvedValue({ praise: null })
    renderFab()

    expect(await screen.findByRole('link', { name: 'AI 코치' })).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('칭찬이 있으면 말풍선이 뜬다', async () => {
    getPraiseMock.mockResolvedValue({
      praise: { id: 7, kind: 'MEAL_STREAK', message: '3일 연속이에요. 잘하고 있어요' },
    })
    renderFab()

    expect(await screen.findByRole('status')).toHaveTextContent('3일 연속이에요. 잘하고 있어요')
  })

  it('닫으면 말풍선이 사라지고 읽음 처리한다', async () => {
    const user = userEvent.setup()
    getPraiseMock.mockResolvedValue({
      praise: { id: 7, kind: 'MEAL_STREAK', message: '3일 연속이에요. 잘하고 있어요' },
    })
    renderFab()

    await user.click(await screen.findByRole('button', { name: '칭찬 닫기' }))

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    // mutationFn에는 context가 함께 들어오므로 첫 인자만 본다
    await waitFor(() => expect(dismissPraiseMock).toHaveBeenCalled())
    expect(dismissPraiseMock.mock.calls[0][0]).toBe(7)
  })

  it('본문을 누르면 AI PT로 가고 읽음 처리한다 — 닫기와는 다른 동작이다', async () => {
    const user = userEvent.setup()
    getPraiseMock.mockResolvedValue({
      praise: { id: 7, kind: 'MEAL_STREAK', message: '3일 연속이에요. 잘하고 있어요' },
    })
    renderFab()

    await user.click(await screen.findByRole('link', { name: '3일 연속이에요. 잘하고 있어요' }))

    expect(screen.getByText('AI PT 화면')).toBeInTheDocument()
    // mutationFn에는 context가 함께 들어오므로 첫 인자만 본다
    await waitFor(() => expect(dismissPraiseMock).toHaveBeenCalled())
    expect(dismissPraiseMock.mock.calls[0][0]).toBe(7)
  })

  it('닫기가 실패해도 알리지 않는다 — 다음 조회에 다시 뜨는 것으로 충분하다', async () => {
    const user = userEvent.setup()
    dismissPraiseMock.mockRejectedValue(new Error('network'))
    getPraiseMock.mockResolvedValue({
      praise: { id: 7, kind: 'MEAL_STREAK', message: '3일 연속이에요. 잘하고 있어요' },
    })
    renderFab()

    await user.click(await screen.findByRole('button', { name: '칭찬 닫기' }))

    await waitFor(() => expect(dismissPraiseMock).toHaveBeenCalled())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
