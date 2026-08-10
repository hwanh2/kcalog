import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getWeights } from '../api/weight'
import { todayLocalDate } from '../lib/date'
import { WeightPage } from './WeightPage'

vi.mock('../api/weight', () => ({
  getWeights: vi.fn(),
  recordWeight: vi.fn(),
}))
const getWeightsMock = vi.mocked(getWeights)

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <WeightPage />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('WeightPage', () => {
  it('오늘 날짜 기본값으로 체중 위젯을 렌더한다', async () => {
    getWeightsMock.mockResolvedValue([{ logDate: todayLocalDate(), weightKg: 70.5 }])
    renderPage()

    expect(screen.getByLabelText('날짜')).toHaveValue(todayLocalDate())
    await waitFor(() => expect(screen.getByLabelText('체중 (kg)')).toHaveValue('70.5'))
  })

  it('날짜를 바꾸면 해당 날짜 기준으로 조회한다', async () => {
    getWeightsMock.mockResolvedValue([])
    renderPage()

    fireEvent.change(screen.getByLabelText('날짜'), { target: { value: '2026-08-01' } })

    await waitFor(() =>
      expect(getWeightsMock).toHaveBeenCalledWith('2026-07-03', '2026-08-01'),
    )
  })
})
