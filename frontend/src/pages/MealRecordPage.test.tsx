import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import { analyzeMeal, saveMeal } from '../api/meal'
import { MealRecordPage } from './MealRecordPage'

vi.mock('../api/meal', () => ({
  analyzeMeal: vi.fn(),
  saveMeal: vi.fn(),
}))
// 리사이즈는 jsdom에서 createImageBitmap 미지원 → 목킹으로 우회
vi.mock('../features/meal/imageResize', () => ({
  resizeImage: vi.fn((b) => Promise.resolve(b)),
}))

const analyzeMealMock = vi.mocked(analyzeMeal)
const saveMealMock = vi.mocked(saveMeal)

function renderPage() {
  const client = new QueryClient()
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/meals/new']}>
        <Routes>
          <Route path="/meals/new" element={<MealRecordPage />} />
          <Route path="/" element={<div>홈 화면</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function pickPhoto() {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  const file = new File(['bytes'], 'food.jpg', { type: 'image/jpeg' })
  return userEvent.upload(input, file)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('MealRecordPage', () => {
  it('사진 분석 성공 — AI 추정값을 채워 확인 화면을 보여준다', async () => {
    analyzeMealMock.mockResolvedValue({
      foodFound: true, totalKcal: 650, carbG: 75, proteinG: 30, fatG: 22, confidence: 0.8, notes: '',
    })
    renderPage()
    await pickPhoto()

    expect(await screen.findByText('AI 추정값이에요. 확인하고 수정할 수 있어요.')).toBeInTheDocument()
    expect(screen.getByLabelText('칼로리 (kcal)')).toHaveValue('650')
    expect(screen.getByLabelText('탄수화물 (g)')).toHaveValue('75')
  })

  it('음식 미검출 — 안내와 함께 빈 수동 입력으로 넘어간다', async () => {
    analyzeMealMock.mockResolvedValue({
      foodFound: false, totalKcal: 0, carbG: 0, proteinG: 0, fatG: 0, confidence: 0, notes: '음식을 찾지 못했어요',
    })
    renderPage()
    await pickPhoto()

    expect(await screen.findByText('음식을 찾지 못했어요')).toBeInTheDocument()
    expect(screen.getByLabelText('칼로리 (kcal)')).toHaveValue('')
  })

  it('분석 429 — 횟수 초과 안내와 함께 수동 입력 폴백', async () => {
    analyzeMealMock.mockRejectedValue(new ApiError(429, null))
    renderPage()
    await pickPhoto()

    expect(await screen.findByText(/오늘 분석 횟수를 초과/)).toBeInTheDocument()
  })

  it('직접 입력 → 저장 — saveMeal 호출 후 홈으로 이동', async () => {
    const user = userEvent.setup()
    saveMealMock.mockResolvedValue({
      id: 1, eatenAt: '', mealType: 'LUNCH', source: 'MANUAL', totalKcal: 500, carbG: 60, proteinG: 20, fatG: 15,
    })
    renderPage()

    await user.click(screen.getByRole('button', { name: '직접 입력' }))
    await user.type(screen.getByLabelText('칼로리 (kcal)'), '500')
    await user.type(screen.getByLabelText('탄수화물 (g)'), '60')
    await user.type(screen.getByLabelText('단백질 (g)'), '20')
    await user.type(screen.getByLabelText('지방 (g)'), '15')
    await user.click(screen.getByRole('button', { name: '저장' }))

    await waitFor(() => expect(screen.getByText('홈 화면')).toBeInTheDocument())
    expect(saveMealMock).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'MANUAL', totalKcal: 500, carbG: 60 }),
    )
  })

  it('범위 밖 값은 저장하지 않고 오류 표시', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: '직접 입력' }))
    await user.type(screen.getByLabelText('칼로리 (kcal)'), '-5')
    await user.type(screen.getByLabelText('탄수화물 (g)'), '10')
    await user.type(screen.getByLabelText('단백질 (g)'), '10')
    await user.type(screen.getByLabelText('지방 (g)'), '10')
    await user.click(screen.getByRole('button', { name: '저장' }))

    expect(screen.getByText('0~10000 범위여야 합니다')).toBeInTheDocument()
    expect(saveMealMock).not.toHaveBeenCalled()
  })
})
