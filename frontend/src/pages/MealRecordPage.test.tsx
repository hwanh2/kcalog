import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import { analyzeMeal, saveMeal } from '../api/meal'
import type { AnalyzedItem } from '../api/meal'
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

const item = (over: Partial<AnalyzedItem> = {}): AnalyzedItem => ({
  name: '김치찌개',
  kcal: 400,
  carbG: 30,
  proteinG: 20,
  fatG: 18,
  box: { x: 0.1, y: 0.2, w: 0.3, h: 0.3 },
  ...over,
})

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
  // jsdom엔 objectURL API가 없어 미리보기용으로 스텁
  globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock')
  globalThis.URL.revokeObjectURL = vi.fn()
})

describe('MealRecordPage', () => {
  it('분석 성공 + 유효 박스·높은 신뢰도 — 오버레이 모드로 항목 라벨을 사진 위에 보여준다', async () => {
    analyzeMealMock.mockResolvedValue({
      foodFound: true,
      items: [item(), item({ name: '공기밥', kcal: 250, box: { x: 0.5, y: 0.55, w: 0.25, h: 0.25 } })],
      overallConfidence: 0.8,
      notes: '',
    })
    renderPage()
    await pickPhoto()

    expect(await screen.findByText('AI 추정값이에요. 확인하고 수정할 수 있어요.')).toBeInTheDocument()
    // 오버레이 라벨(이름+kcal 붙은 형태)은 오버레이 모드에서만 렌더
    expect(screen.getByText(/김치찌개\s*400kcal/)).toBeInTheDocument()
    // 항목 편집 필드도 채워진다
    expect(screen.getAllByLabelText('이름')[0]).toHaveValue('김치찌개')
    // 합계 = 400 + 250
    expect(screen.getByText('650 kcal')).toBeInTheDocument()
  })

  it('낮은 신뢰도 — 오버레이 없이 목록형으로 폴백한다', async () => {
    analyzeMealMock.mockResolvedValue({
      foodFound: true,
      items: [item()],
      overallConfidence: 0.3, // 임계 미만
      notes: '',
    })
    renderPage()
    await pickPhoto()

    await screen.findByText('AI 추정값이에요. 확인하고 수정할 수 있어요.')
    expect(screen.queryByText(/김치찌개\s*400kcal/)).not.toBeInTheDocument() // 오버레이 라벨 없음
    expect(screen.getAllByLabelText('이름')[0]).toHaveValue('김치찌개') // 목록 편집은 그대로
  })

  it('음식 미검출 — 안내와 함께 빈 수동 항목으로 넘어간다', async () => {
    analyzeMealMock.mockResolvedValue({
      foodFound: false,
      items: [],
      overallConfidence: 0,
      notes: '음식을 찾지 못했어요',
    })
    renderPage()
    await pickPhoto()

    expect(await screen.findByText('음식을 찾지 못했어요')).toBeInTheDocument()
    expect(screen.getByLabelText('이름')).toHaveValue('')
  })

  it('분석 429 — 횟수 초과 안내와 함께 수동 입력 폴백', async () => {
    analyzeMealMock.mockRejectedValue(new ApiError(429, null))
    renderPage()
    await pickPhoto()

    expect(await screen.findByText(/오늘 분석 횟수를 초과/)).toBeInTheDocument()
  })

  it('항목 추가·삭제 — 합계가 재계산된다', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: '직접 입력' }))

    await user.type(screen.getByLabelText('칼로리 (kcal)'), '400')
    expect(screen.getByText('400 kcal')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '+ 음식 추가' }))
    await user.type(screen.getAllByLabelText('칼로리 (kcal)')[1], '250')
    expect(screen.getByText('650 kcal')).toBeInTheDocument() // 합계 재계산

    await user.click(screen.getByRole('button', { name: '음식 2 삭제' }))
    expect(screen.getByText('400 kcal')).toBeInTheDocument() // 삭제 후 재계산
  })

  it('직접 입력 → 저장 — items로 saveMeal 호출 후 홈으로 이동', async () => {
    const user = userEvent.setup()
    saveMealMock.mockResolvedValue({
      id: 1,
      eatenAt: '',
      mealType: 'LUNCH',
      source: 'MANUAL',
      totalKcal: 500,
      carbG: 60,
      proteinG: 20,
      fatG: 15,
      items: [{ name: '비빔밥', kcal: 500, carbG: 60, proteinG: 20, fatG: 15 }],
    })
    renderPage()

    await user.click(screen.getByRole('button', { name: '직접 입력' }))
    await user.type(screen.getByLabelText('이름'), '비빔밥')
    await user.type(screen.getByLabelText('칼로리 (kcal)'), '500')
    await user.type(screen.getByLabelText('탄 (g)'), '60')
    await user.type(screen.getByLabelText('단 (g)'), '20')
    await user.type(screen.getByLabelText('지 (g)'), '15')
    await user.click(screen.getByRole('button', { name: '저장' }))

    await waitFor(() => expect(screen.getByText('홈 화면')).toBeInTheDocument())
    expect(saveMealMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'MANUAL',
        items: [{ name: '비빔밥', kcal: 500, carbG: 60, proteinG: 20, fatG: 15 }],
      }),
    )
  })

  it('범위 밖 값은 저장하지 않고 오류 표시', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: '직접 입력' }))
    await user.type(screen.getByLabelText('이름'), '음식')
    await user.type(screen.getByLabelText('칼로리 (kcal)'), '99999')
    await user.click(screen.getByRole('button', { name: '저장' }))

    expect(screen.getByText('0~10000 정수여야 합니다')).toBeInTheDocument()
    expect(saveMealMock).not.toHaveBeenCalled()
  })
})
