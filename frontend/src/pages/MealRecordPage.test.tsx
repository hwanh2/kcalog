import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../api/client'
import { createAnalysis, getAnalysis } from '../api/analysis'
import type { Analysis, AnalysisStatus } from '../api/analysis'
import { saveMeal } from '../api/meal'
import type { AnalyzedItem, MealAnalysis } from '../api/meal'
import { MealRecordPage } from './MealRecordPage'

vi.mock('../api/meal', () => ({
  saveMeal: vi.fn(),
}))
vi.mock('../api/analysis', () => ({
  createAnalysis: vi.fn(),
  getAnalysis: vi.fn(),
}))
// 리사이즈는 jsdom에서 createImageBitmap 미지원 → 목킹으로 우회
vi.mock('../features/meal/imageResize', () => ({
  resizeImage: vi.fn((b) => Promise.resolve(b)),
}))

const createAnalysisMock = vi.mocked(createAnalysis)
const getAnalysisMock = vi.mocked(getAnalysis)
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

// 오버레이 대상 — 유효 박스 2개 + 높은 신뢰도
const overlayResult: MealAnalysis = {
  foodFound: true,
  items: [item(), item({ name: '공기밥', kcal: 250, carbG: 55, proteinG: 5, fatG: 1, box: { x: 0.5, y: 0.55, w: 0.25, h: 0.25 } })],
  overallConfidence: 0.8,
  notes: '',
}

/** 분석 흐름 목 설정 — 생성은 ANALYZING, 폴링(getAnalysis)은 주어진 종료 상태·결과를 반환 */
function mockAnalysis(status: AnalysisStatus, result: MealAnalysis | null) {
  createAnalysisMock.mockResolvedValue({ id: 1, status: 'ANALYZING', imageUrl: '', result: null, errorCode: null })
  const terminal: Analysis = { id: 1, status, imageUrl: '/api/photos/1/x', result, errorCode: null }
  getAnalysisMock.mockResolvedValue(terminal)
}

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

describe('MealRecordPage — 오버레이-편집 모드', () => {
  it('유효 박스+높은 신뢰도 — 사진 위 박스로 렌더하고 하단에 총량을 보여준다', async () => {
    mockAnalysis('COMPLETED', overlayResult)
    renderPage()
    await pickPhoto()

    // 박스는 탭 가능한 버튼(aria-label)로 렌더
    expect(await screen.findByRole('button', { name: '김치찌개 편집' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '공기밥 편집' })).toBeInTheDocument()
    // 합계 = 400 + 250
    expect(screen.getByText('650 kcal')).toBeInTheDocument()
    // 편집 필드는 시트를 열기 전까진 인라인에 없음
    expect(screen.queryByLabelText('이름')).not.toBeInTheDocument()
  })

  it('박스 탭 → 편집 시트에서 값을 바꾸면 합계가 재계산된다', async () => {
    const user = userEvent.setup()
    mockAnalysis('COMPLETED', overlayResult)
    renderPage()
    await pickPhoto()

    await user.click(await screen.findByRole('button', { name: '김치찌개 편집' }))
    expect(screen.getByRole('dialog', { name: '음식 편집' })).toBeInTheDocument()

    const kcal = screen.getByLabelText('칼로리 (kcal)')
    await user.clear(kcal)
    await user.type(kcal, '500')
    expect(screen.getByText('750 kcal')).toBeInTheDocument() // 500 + 250

    await user.click(screen.getByRole('button', { name: '완료' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('오버레이에서 "+ 음식 추가" → 위치 없는 항목 칩으로 편집·추가된다', async () => {
    const user = userEvent.setup()
    mockAnalysis('COMPLETED', overlayResult)
    renderPage()
    await pickPhoto()

    await user.click(await screen.findByRole('button', { name: '+ 음식 추가' }))
    // 새 항목 편집 시트가 열림
    await user.type(screen.getByLabelText('이름'), '된장국')
    await user.type(screen.getByLabelText('칼로리 (kcal)'), '100')
    await user.click(screen.getByRole('button', { name: '완료' }))

    // 위치 없는 항목 칩 영역에 추가되고 합계 반영(650 + 100)
    expect(screen.getByText('위치 없는 항목')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '된장국 편집' })).toBeInTheDocument()
    expect(screen.getByText('750 kcal')).toBeInTheDocument()
  })

  it('오버레이 모드에서 저장 — items로 saveMeal 호출 후 홈으로', async () => {
    const user = userEvent.setup()
    mockAnalysis('COMPLETED', overlayResult)
    saveMealMock.mockResolvedValue({
      id: 1, eatenAt: '', mealType: 'LUNCH', source: 'AI', totalKcal: 650, carbG: 85, proteinG: 25, fatG: 19, imageUrl: null, items: [],
    })
    renderPage()
    await pickPhoto()

    await user.click(await screen.findByRole('button', { name: '저장' }))

    await waitFor(() => expect(screen.getByText('홈 화면')).toBeInTheDocument())
    expect(saveMealMock).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'AI',
        analysisJobId: 1, // 분석 작업의 사진을 연결
        items: expect.arrayContaining([expect.objectContaining({ name: '김치찌개', kcal: 400 })]),
      }),
    )
  })
})

describe('MealRecordPage — 리스트 폴백/수동', () => {
  it('낮은 신뢰도 — 오버레이 없이 리스트 인라인 편집으로 폴백', async () => {
    mockAnalysis('COMPLETED', { ...overlayResult, overallConfidence: 0.3 })
    renderPage()
    await pickPhoto()

    await screen.findByText('AI 추정값이에요. 확인하고 수정할 수 있어요.')
    expect(screen.queryByRole('button', { name: '김치찌개 편집' })).not.toBeInTheDocument() // 박스 없음
    expect(screen.getAllByLabelText('이름')[0]).toHaveValue('김치찌개') // 인라인 리스트 편집
  })

  it('음식 미검출 — 안내와 함께 빈 수동 항목(리스트)으로', async () => {
    mockAnalysis('NO_FOOD', { foodFound: false, items: [], overallConfidence: 0, notes: '음식을 찾지 못했어요' })
    renderPage()
    await pickPhoto()

    expect(await screen.findByText('음식을 찾지 못했어요')).toBeInTheDocument()
    expect(screen.getByLabelText('이름')).toHaveValue('')
  })

  it('분석 429 — 횟수 초과 안내와 함께 수동 입력 폴백', async () => {
    createAnalysisMock.mockRejectedValue(new ApiError(429, null))
    renderPage()
    await pickPhoto()

    expect(await screen.findByText(/오늘 분석 횟수를 초과/)).toBeInTheDocument()
  })

  it('항목 추가·삭제 — 합계가 재계산된다(리스트)', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: '직접 입력' }))

    await user.type(screen.getByLabelText('칼로리 (kcal)'), '400')
    expect(screen.getByText('400 kcal')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '+ 음식 추가' }))
    await user.type(screen.getAllByLabelText('칼로리 (kcal)')[1], '250')
    expect(screen.getByText('650 kcal')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '음식 2 삭제' }))
    expect(screen.getByText('400 kcal')).toBeInTheDocument()
  })

  it('직접 입력 → 저장 — items로 saveMeal 호출 후 홈으로', async () => {
    const user = userEvent.setup()
    saveMealMock.mockResolvedValue({
      id: 1, eatenAt: '', mealType: 'LUNCH', source: 'MANUAL', totalKcal: 500, carbG: 60, proteinG: 20, fatG: 15, imageUrl: null,
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

  it('범위 밖 값은 저장하지 않고 오류 표시(리스트)', async () => {
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
