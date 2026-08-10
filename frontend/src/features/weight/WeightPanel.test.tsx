import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getWeightSummary, recordWeight } from '../../api/weight'
import type { WeightSummary } from '../../api/weight'
import { WeightPanel } from './WeightPanel'

vi.mock('../../api/weight', () => ({
  getWeightSummary: vi.fn(),
  recordWeight: vi.fn(),
}))
const getSummaryMock = vi.mocked(getWeightSummary)
const recordWeightMock = vi.mocked(recordWeight)

const DATE = '2026-08-08'

const emptySummary: WeightSummary = {
  points: [],
  latestKg: null,
  latestTrendKg: null,
  bmi: null,
  streakDays: 0,
  projection: { status: 'NO_GOAL', targetKg: null, projectedDate: null, weeks: null, weeklyRateKg: null },
}

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <WeightPanel date={DATE} />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('WeightPanel', () => {
  it('기존 기록이 있으면 입력을 채우고 추세·지난주 대비·목표 에스티메이터를 그린다', async () => {
    getSummaryMock.mockResolvedValue({
      ...emptySummary,
      points: [
        { logDate: '2026-08-07', weightKg: 71, trendKg: 71 },
        { logDate: DATE, weightKg: 70.5, trendKg: 70.9 },
      ],
      latestKg: 70.5,
      latestTrendKg: 70.9,
      streakDays: 2,
      projection: { status: 'INSUFFICIENT_DATA', targetKg: 65, projectedDate: null, weeks: null, weeklyRateKg: null },
    })
    renderPanel()

    await waitFor(() => expect(screen.getByLabelText('체중 (kg)')).toHaveValue('70.5'))
    expect(screen.getByRole('button', { name: '체중 수정' })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '체중 추이 그래프' })).toBeInTheDocument()
    expect(screen.getByText('-0.5kg')).toBeInTheDocument() // 어제보다 (71 → 70.5)
    expect(screen.getByText(/목표 체중 65 kg까지/)).toBeInTheDocument()
  })

  it('−/＋로 0.1씩 조절한다', async () => {
    const user = userEvent.setup()
    getSummaryMock.mockResolvedValue({
      ...emptySummary,
      points: [{ logDate: DATE, weightKg: 70.0, trendKg: 70.0 }],
      latestKg: 70.0,
    })
    renderPanel()

    await waitFor(() => expect(screen.getByLabelText('체중 (kg)')).toHaveValue('70'))
    await user.click(screen.getByRole('button', { name: '0.1 증가' }))
    expect(screen.getByLabelText('체중 (kg)')).toHaveValue('70.1')
  })

  it('체중 저장 — recordWeight를 날짜와 함께 호출', async () => {
    const user = userEvent.setup()
    getSummaryMock.mockResolvedValue(emptySummary)
    recordWeightMock.mockResolvedValue({ logDate: DATE, weightKg: 68.2 })
    renderPanel()

    await user.type(screen.getByLabelText('체중 (kg)'), '68.2')
    await user.click(screen.getByRole('button', { name: '체중 저장' }))

    await waitFor(() =>
      expect(recordWeightMock).toHaveBeenCalledWith({ weightKg: 68.2, logDate: DATE }),
    )
  })

  it('범위 밖 값은 저장하지 않고 오류 표시', async () => {
    const user = userEvent.setup()
    getSummaryMock.mockResolvedValue(emptySummary)
    renderPanel()

    await user.type(screen.getByLabelText('체중 (kg)'), '300')
    await user.click(screen.getByRole('button', { name: '체중 저장' }))

    expect(screen.getByText(/30~250kg 범위/)).toBeInTheDocument()
    expect(recordWeightMock).not.toHaveBeenCalled()
  })

  it('기록이 없으면 추이 대신 안내', async () => {
    getSummaryMock.mockResolvedValue(emptySummary)
    renderPanel()

    expect(await screen.findByText('최근 체중 기록이 없어요.')).toBeInTheDocument()
  })
})
