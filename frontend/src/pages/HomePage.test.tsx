import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getDashboard } from '../api/dashboard'
import type { Dashboard } from '../api/dashboard'
import { getMeals } from '../api/meal'
import type { Meal } from '../api/meal'
import { getWeights } from '../api/weight'
import { HomePage } from './HomePage'

vi.mock('../api/dashboard', () => ({ getDashboard: vi.fn() }))
vi.mock('../api/meal', () => ({ getMeals: vi.fn() }))
vi.mock('../api/weight', () => ({ getWeights: vi.fn() }))
const getDashboardMock = vi.mocked(getDashboard)
const getMealsMock = vi.mocked(getMeals)
const getWeightsMock = vi.mocked(getWeights)

const dashboard: Dashboard = {
  totalKcal: 1050,
  carbG: 115,
  proteinG: 45,
  fatG: 32,
  dailyKcalTarget: 2000,
  remainingKcal: 950,
  carbTargetG: 250,
  proteinTargetG: 150,
  fatTargetG: 44,
  timeline: [],
}

const lunch: Meal = {
  id: 1,
  eatenAt: '2026-08-08T03:00:00Z',
  mealType: 'LUNCH',
  source: 'AI',
  totalKcal: 650,
  carbG: 75,
  proteinG: 30,
  fatG: 22,
  items: [{ name: '김치찌개', kcal: 650, carbG: 75, proteinG: 30, fatG: 22 }],
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
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
  getDashboardMock.mockResolvedValue(dashboard)
  getMealsMock.mockResolvedValue([])
  getWeightsMock.mockResolvedValue([])
})

describe('HomePage 대시보드', () => {
  it('칼로리 링 — 남은 칼로리와 섭취/목표를 표시', async () => {
    renderPage()

    expect(await screen.findByText('남은 칼로리')).toBeInTheDocument()
    expect(screen.getByText('950')).toBeInTheDocument()
    expect(screen.getByText(/섭취 1,050/)).toBeInTheDocument()
    expect(screen.getByText(/목표 2,000 kcal/)).toBeInTheDocument()
  })

  it('탄단지 달성도 — 매크로별 목표 대비 g·%', async () => {
    renderPage()

    expect(await screen.findByText('오늘의 탄·단·지 달성도')).toBeInTheDocument()
    // 탄 115/250 = 46%
    expect(screen.getByText(/115g/)).toBeInTheDocument()
    expect(screen.getByText(/\/ 250g \(46%\)/)).toBeInTheDocument()
  })

  it('목표 초과 — "목표 초과"와 절대값 표시', async () => {
    getDashboardMock.mockResolvedValue({ ...dashboard, totalKcal: 2400, remainingKcal: -400 })
    renderPage()

    expect(await screen.findByText('목표 초과')).toBeInTheDocument()
    expect(screen.getByText('400')).toBeInTheDocument()
  })

  it('오늘 식사 목록 — 음식명·kcal·매크로 칩', async () => {
    getMealsMock.mockResolvedValue([lunch])
    renderPage()

    expect(await screen.findByText('김치찌개')).toBeInTheDocument()
    expect(screen.getByText('650 kcal')).toBeInTheDocument()
    expect(screen.getByText('탄 75g')).toBeInTheDocument()
  })

  it('기록 없는 날 — 안내 문구', async () => {
    renderPage()
    expect(await screen.findByText('오늘 기록한 식사가 없어요.')).toBeInTheDocument()
  })

  it('전체보기 — 음식기록 탭 링크', async () => {
    renderPage()
    const link = await screen.findByRole('link', { name: /전체보기/ })
    expect(link).toHaveAttribute('href', '/records')
  })

  it('체중 미니카드 — 최근 체중·변화량', async () => {
    getWeightsMock.mockResolvedValue([
      { logDate: '2026-08-01', weightKg: 68.7 },
      { logDate: '2026-08-08', weightKg: 68.4 },
    ])
    renderPage()

    expect(await screen.findByText('68.4')).toBeInTheDocument()
    expect(screen.getByText('-0.3kg')).toBeInTheDocument()
  })

  it('날짜 이동 — 이전 날짜로 바꾸면 그 날짜로 다시 조회', async () => {
    const user = userEvent.setup()
    renderPage()
    await screen.findByText('남은 칼로리')

    await user.click(screen.getByRole('button', { name: '이전 날짜' }))

    // 오늘 + 이전날 = getMeals가 최소 2개 날짜로 호출됨
    await waitFor(() => expect(getMealsMock.mock.calls.length).toBeGreaterThanOrEqual(2))
  })

  it('조회 실패 — 에러 안내', async () => {
    getDashboardMock.mockRejectedValue(new Error('down'))
    renderPage()
    expect(await screen.findByText(/대시보드를 불러오지 못했어요/)).toBeInTheDocument()
  })
})
