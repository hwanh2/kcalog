import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteMeal, getMeals, updateMeal } from '../api/meal'
import type { Meal } from '../api/meal'
import { RecordsPage } from './RecordsPage'

vi.mock('../api/meal', () => ({
  getMeals: vi.fn(),
  updateMeal: vi.fn(),
  deleteMeal: vi.fn(),
}))
const getMealsMock = vi.mocked(getMeals)
const updateMealMock = vi.mocked(updateMeal)
const deleteMealMock = vi.mocked(deleteMeal)

const lunch: Meal = {
  id: 1,
  eatenAt: '2026-08-06T03:30:00Z',
  mealType: 'LUNCH',
  source: 'AI',
  totalKcal: 650,
  carbG: 75,
  proteinG: 30,
  fatG: 22,
  items: [
    { name: '김치찌개', kcal: 400, carbG: 30, proteinG: 20, fatG: 18 },
    { name: '공기밥', kcal: 250, carbG: 45, proteinG: 10, fatG: 4 },
  ],
}

function renderPage() {
  const client = new QueryClient()
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <RecordsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('RecordsPage', () => {
  it('날짜의 식사 목록을 음식별로 표시한다', async () => {
    getMealsMock.mockResolvedValue([lunch])
    renderPage()

    expect(await screen.findByText('점심')).toBeInTheDocument()
    expect(screen.getByText('650 kcal')).toBeInTheDocument()
    expect(screen.getByText('김치찌개 · 공기밥')).toBeInTheDocument()
    expect(screen.getByText(/탄 75 · 단 30 · 지 22/)).toBeInTheDocument()
  })

  it('기록이 없으면 안내를 보여준다', async () => {
    getMealsMock.mockResolvedValue([])
    renderPage()
    expect(await screen.findByText('이 날의 식사 기록이 없어요.')).toBeInTheDocument()
  })

  it('삭제 — deleteMeal 호출', async () => {
    const user = userEvent.setup()
    getMealsMock.mockResolvedValue([lunch])
    deleteMealMock.mockResolvedValue(undefined)
    renderPage()

    await user.click(await screen.findByRole('button', { name: '삭제' }))
    expect(deleteMealMock).toHaveBeenCalledWith(1)
  })

  it('수정 — 항목 값을 바꿔 items로 updateMeal 호출', async () => {
    const user = userEvent.setup()
    getMealsMock.mockResolvedValue([lunch])
    updateMealMock.mockResolvedValue({ ...lunch, totalKcal: 750 })
    renderPage()

    await user.click(await screen.findByRole('button', { name: '수정' }))
    const kcalField = screen.getAllByLabelText('칼로리 (kcal)')[0] // 첫 항목(김치찌개)
    await user.clear(kcalField)
    await user.type(kcalField, '500')
    await user.click(screen.getByRole('button', { name: '저장' }))

    await waitFor(() =>
      expect(updateMealMock).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          items: expect.arrayContaining([expect.objectContaining({ name: '김치찌개', kcal: 500 })]),
        }),
      ),
    )
  })

  it('수정 중 범위 밖 값은 저장하지 않는다', async () => {
    const user = userEvent.setup()
    getMealsMock.mockResolvedValue([lunch])
    renderPage()

    await user.click(await screen.findByRole('button', { name: '수정' }))
    const kcalField = screen.getAllByLabelText('칼로리 (kcal)')[0]
    await user.clear(kcalField)
    await user.type(kcalField, '99999')
    await user.click(screen.getByRole('button', { name: '저장' }))

    expect(screen.getByText('0~10000 정수여야 합니다')).toBeInTheDocument()
    expect(updateMealMock).not.toHaveBeenCalled()
  })
})
