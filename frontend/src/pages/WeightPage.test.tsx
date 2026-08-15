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
// 체중 탭에 유지칼로리 카드가 붙어 있어 tdee 조회를 목킹(카드는 데이터 없으면 렌더 안 함)
vi.mock('../api/tdee', () => ({ getTdee: vi.fn(() => new Promise(() => {})) }))
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

  it('제목은 하단 탭이 말한다 — 화면에 보이지 않되 h1으로는 남는다', () => {
    getSummaryMock.mockResolvedValue(emptySummary)
    renderPage()

    // 지우지 않는 이유 — 스크린리더 사용자는 제목으로 화면을 식별한다(app-shell 스펙)
    expect(screen.getByRole('heading', { level: 1, name: '체중' })).toHaveClass('sr-only')
  })
})
