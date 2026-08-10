import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getWeightSummary } from '../api/weight'
import type { WeightSummary } from '../api/weight'
import { addDays, todayLocalDate } from '../lib/date'
import { WeightPage } from './WeightPage'

vi.mock('../api/weight', () => ({
  getWeightSummary: vi.fn(),
  recordWeight: vi.fn(),
}))
const getSummaryMock = vi.mocked(getWeightSummary)

const emptySummary: WeightSummary = {
  points: [],
  latestKg: null,
  latestTrendKg: null,
  bmi: null,
  streakDays: 0,
  projection: { status: 'NO_GOAL', targetKg: null, projectedDate: null, weeks: null, weeklyRateKg: null },
}

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
  it('오늘 기준 90일 구간으로 체중 위젯을 렌더한다(캘린더 없음)', async () => {
    getSummaryMock.mockResolvedValue({
      ...emptySummary,
      points: [{ logDate: todayLocalDate(), weightKg: 70.5, trendKg: 70.5 }],
      latestKg: 70.5,
    })
    renderPage()

    // 상단 날짜 선택 캘린더가 없어야 한다
    expect(screen.queryByLabelText('날짜')).not.toBeInTheDocument()

    await waitFor(() => expect(screen.getByLabelText('체중 (kg)')).toHaveValue('70.5'))
    expect(getSummaryMock).toHaveBeenCalledWith(addDays(todayLocalDate(), -89), todayLocalDate())
  })
})
