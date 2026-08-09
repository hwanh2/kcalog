import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getDashboard } from '../api/dashboard'
import type { Dashboard } from '../api/dashboard'
import { HomePage } from './HomePage'

vi.mock('../api/dashboard', () => ({ getDashboard: vi.fn() }))
const getDashboardMock = vi.mocked(getDashboard)

const base: Dashboard = {
  totalKcal: 1050,
  carbG: 115,
  proteinG: 45,
  fatG: 32,
  dailyKcalTarget: 2000,
  remainingKcal: 950,
  timeline: [{ id: 1, eatenAt: '2026-08-08T03:00:00Z', mealType: 'LUNCH', totalKcal: 650 }],
}

function renderPage() {
  const client = new QueryClient()
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('HomePage 대시보드', () => {
  it('잔여 칼로리와 식사 타임라인을 표시한다', async () => {
    getDashboardMock.mockResolvedValue(base)
    renderPage()

    expect(await screen.findByText('남은 칼로리')).toBeInTheDocument()
    expect(screen.getByText('950')).toBeInTheDocument()
    expect(screen.getByText(/섭취 1050 \/ 목표 2000/)).toBeInTheDocument()
    expect(screen.getByText('점심')).toBeInTheDocument()
    expect(screen.getByText('650 kcal')).toBeInTheDocument()
  })

  it('목표 초과 — "목표 초과"와 절대값을 표시한다', async () => {
    getDashboardMock.mockResolvedValue({ ...base, totalKcal: 2400, remainingKcal: -400 })
    renderPage()

    expect(await screen.findByText('목표 초과')).toBeInTheDocument()
    expect(screen.getByText('400')).toBeInTheDocument()
  })

  it('기록 없는 날 — 빈 타임라인 안내', async () => {
    getDashboardMock.mockResolvedValue({
      totalKcal: 0, carbG: 0, proteinG: 0, fatG: 0, dailyKcalTarget: 2000, remainingKcal: 2000, timeline: [],
    })
    renderPage()

    expect(await screen.findByText('오늘 기록한 식사가 없어요.')).toBeInTheDocument()
  })

  it('식사 기록 진입 링크', async () => {
    getDashboardMock.mockResolvedValue(base)
    renderPage()

    expect(await screen.findByRole('link', { name: '+ 식사 기록' })).toBeInTheDocument()
  })
})
