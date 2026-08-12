import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { reanalyze } from '../../api/analysis'
import type { Analysis } from '../../api/analysis'
import { ApiError } from '../../api/client'
import { saveFavorite } from '../../api/food'
import { AnalysisResultSheet } from './AnalysisResultSheet'
import { pollAnalysis } from './pollAnalysis'

vi.mock('../../api/analysis', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/analysis')>()),
  reanalyze: vi.fn(),
}))
vi.mock('../../api/food', () => ({ saveFavorite: vi.fn() }))
vi.mock('./pollAnalysis', () => ({ pollAnalysis: vi.fn() }))

const reanalyzeMock = vi.mocked(reanalyze)
const pollAnalysisMock = vi.mocked(pollAnalysis)
const saveFavoriteMock = vi.mocked(saveFavorite)

function analysisWith(name: string, kcal: number): Analysis {
  return {
    id: 7,
    status: 'COMPLETED',
    imageUrl: null,
    errorCode: null,
    result: {
      foodFound: true,
      overallConfidence: 0.9,
      notes: '',
      items: [
        { name, kcal, carbG: 30, proteinG: 20, fatG: 18, amount: 1, unit: '인분', box: null, corrected: false },
      ],
    },
  }
}

function renderSheet() {
  const onSave = vi.fn()
  const onClose = vi.fn()
  render(
    <AnalysisResultSheet
      analysis={analysisWith('김치찌개', 400)}
      photoUrl={null}
      mealType="LUNCH"
      onAnalysisChange={vi.fn()}
      onSave={onSave}
      onClose={onClose}
    />,
  )
  return { onSave, onClose }
}

async function requestReanalysis(user: ReturnType<typeof userEvent.setup>, note: string) {
  await user.type(screen.getByLabelText(/설명을 덧붙여 다시 분석/), note)
  await user.click(screen.getByRole('button', { name: '재분석' }))
}

beforeEach(() => {
  vi.clearAllMocks()
  reanalyzeMock.mockResolvedValue({ ...analysisWith('김치찌개', 400), status: 'ANALYZING', result: null })
  pollAnalysisMock.mockResolvedValue(analysisWith('된장찌개', 250))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('저장', () => {
  it('확인한 항목을 그 끼니로 넘긴다', async () => {
    const user = userEvent.setup()
    const { onSave } = renderSheet()

    await user.click(screen.getByRole('button', { name: '점심에 기록하기' }))

    expect(onSave).toHaveBeenCalledWith([expect.objectContaining({ name: '김치찌개', kcal: '400' })])
  })
})

describe('재분석', () => {
  it('설명을 덧붙이면 결과가 새 값으로 바뀐다', async () => {
    const user = userEvent.setup()
    renderSheet()

    await requestReanalysis(user, '된장찌개였어요')

    expect(await screen.findByText('된장찌개')).toBeInTheDocument()
    expect(reanalyzeMock).toHaveBeenCalledWith(7, '된장찌개였어요')
  })

  it('설명이 비면 재분석 버튼이 눌리지 않는다', () => {
    renderSheet()

    expect(screen.getByRole('button', { name: '재분석' })).toBeDisabled()
  })

  it('값을 고친 뒤 재분석하면 덮어쓰기 경고로 확인을 받는다', async () => {
    const user = userEvent.setup()
    const confirm = vi.fn().mockReturnValue(false)
    vi.stubGlobal('confirm', confirm)
    renderSheet()

    // 항목을 열어 값을 고친다(= dirty)
    await user.click(screen.getByRole('button', { name: /김치찌개 항목 편집/ }))
    const kcalField = screen.getByLabelText('칼로리 (kcal)')
    await user.clear(kcalField)
    await user.type(kcalField, '500')
    await user.click(screen.getByRole('button', { name: '완료' }))

    await requestReanalysis(user, '다시 봐주세요')

    expect(confirm).toHaveBeenCalledWith('수정한 값이 사라집니다. 계속할까요?')
    expect(reanalyzeMock).not.toHaveBeenCalled() // 취소했으므로 호출하지 않는다
  })

  it('상한을 넘기면(400) 안내하고 직전 결과를 유지한다', async () => {
    const user = userEvent.setup()
    reanalyzeMock.mockRejectedValue(new ApiError(400, null))
    renderSheet()

    await requestReanalysis(user, '세 번째 시도')

    expect(await screen.findByText(/재분석은 2회까지 할 수 있어요/)).toBeInTheDocument()
    expect(screen.getByText('김치찌개')).toBeInTheDocument() // 직전 결과 그대로
  })

  it('일일 횟수를 넘기면(429) 안내한다', async () => {
    const user = userEvent.setup()
    reanalyzeMock.mockRejectedValue(new ApiError(429, null))
    renderSheet()

    await requestReanalysis(user, '한 번 더')

    expect(await screen.findByText(/오늘 분석 횟수를 초과했어요/)).toBeInTheDocument()
  })

  it('재분석이 음식을 못 찾으면 직전 결과를 되돌린다', async () => {
    const user = userEvent.setup()
    pollAnalysisMock.mockResolvedValue({
      ...analysisWith('김치찌개', 400),
      status: 'NO_FOOD',
      result: { foodFound: false, items: [], overallConfidence: 0, notes: '' },
    })
    renderSheet()

    await requestReanalysis(user, '엉뚱한 설명')

    expect(await screen.findByText(/설명에서 음식을 찾지 못했어요/)).toBeInTheDocument()
    expect(screen.getByText('김치찌개')).toBeInTheDocument() // 복원됨
  })
})

describe('즐겨찾기 저장', () => {
  it('항목의 ★로 그 값을 즐겨찾기에 담는다', async () => {
    const user = userEvent.setup()
    saveFavoriteMock.mockResolvedValue({
      id: 1,
      source: 'FAVORITE',
      name: '김치찌개',
      emoji: null,
      aliases: [],
      quantity: 1,
      unit: '인분',
      kcal: 400,
      carbG: 30,
      proteinG: 20,
      fatG: 18,
    })
    renderSheet()

    await user.click(screen.getByRole('button', { name: /김치찌개 즐겨찾기에 저장/ }))
    await user.click(screen.getByRole('button', { name: '즐겨찾기에 저장' }))

    await waitFor(() => expect(saveFavoriteMock).toHaveBeenCalled())
    expect(saveFavoriteMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({ name: '김치찌개', kcal: 400, quantity: 1, unit: '인분' }),
    )
  })
})
