import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createAnalysis } from '../../api/analysis'
import type { Analysis } from '../../api/analysis'
import { ApiError } from '../../api/client'
import { AiRecordPanel } from './AiRecordPanel'
import { pollAnalysis } from './pollAnalysis'

vi.mock('../../api/analysis', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/analysis')>()),
  createAnalysis: vi.fn(),
  reanalyze: vi.fn(),
}))
vi.mock('./pollAnalysis', () => ({ pollAnalysis: vi.fn() }))
vi.mock('./imageResize', () => ({ resizeImage: vi.fn(async (file: Blob) => file) }))

const createAnalysisMock = vi.mocked(createAnalysis)
const pollAnalysisMock = vi.mocked(pollAnalysis)

const completed: Analysis = {
  id: 7,
  status: 'COMPLETED',
  imageUrl: null,
  errorCode: null,
  result: {
    foodFound: true,
    overallConfidence: 0.9,
    notes: '',
    items: [
      {
        name: '김밥',
        kcal: 480,
        carbG: 75,
        proteinG: 14,
        fatG: 12,
        amount: 1,
        unit: '줄',
        box: null,
        corrected: false,
      },
    ],
  },
}

function renderPanel() {
  const onSave = vi.fn()
  const onManual = vi.fn()
  const onMealTypeChange = vi.fn()
  render(
    <AiRecordPanel
      mealType="LUNCH"
      onMealTypeChange={onMealTypeChange}
      onSave={onSave}
      onManual={onManual}
    />,
  )
  return { onSave, onManual, onMealTypeChange }
}

/** 사진 선택 — label 안 파일 입력에 직접 넣는다 */
async function pickPhoto(user: ReturnType<typeof userEvent.setup>) {
  const file = new File(['fake'], 'meal.jpg', { type: 'image/jpeg' })
  const input = document.querySelector('input[type="file"]') as HTMLInputElement
  await user.upload(input, file)
}

beforeEach(() => {
  vi.clearAllMocks()
  createAnalysisMock.mockResolvedValue({ ...completed, status: 'ANALYZING', result: null })
  pollAnalysisMock.mockResolvedValue(completed)
})

describe('입력 조합', () => {
  it('사진도 설명도 없으면 분석할 수 없다', async () => {
    renderPanel()

    expect(screen.getByRole('button', { name: '분석하기' })).toBeDisabled()
  })

  it('설명만으로 분석한다 — 사진 없이 note만 보낸다', async () => {
    const user = userEvent.setup()
    renderPanel()

    await user.type(screen.getByLabelText(/무엇을 드셨나요/), '김밥 한 줄')
    await user.click(screen.getByRole('button', { name: '분석하기' }))

    await waitFor(() => expect(createAnalysisMock).toHaveBeenCalledWith({ note: '김밥 한 줄', image: undefined }))
    expect(await screen.findByText('분석 결과 확인')).toBeInTheDocument()
  })

  it('사진만으로 분석한다', async () => {
    const user = userEvent.setup()
    renderPanel()

    await pickPhoto(user)
    await user.click(screen.getByRole('button', { name: '분석하기' }))

    await waitFor(() => expect(createAnalysisMock).toHaveBeenCalled())
    expect(createAnalysisMock.mock.calls[0][0].image).toBeInstanceOf(File)
    expect(createAnalysisMock.mock.calls[0][0].note).toBeUndefined()
  })

  it('사진과 설명을 함께 보낸다', async () => {
    const user = userEvent.setup()
    renderPanel()

    await pickPhoto(user)
    await user.type(screen.getByLabelText(/무엇을 드셨나요/), '드레싱은 절반만')
    await user.click(screen.getByRole('button', { name: '분석하기' }))

    await waitFor(() => expect(createAnalysisMock).toHaveBeenCalled())
    expect(createAnalysisMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({ note: '드레싱은 절반만', image: expect.any(File) }),
    )
  })
})

describe('실패 폴백', () => {
  it('일일 횟수를 넘기면(429) 직접 입력을 안내한다', async () => {
    const user = userEvent.setup()
    createAnalysisMock.mockRejectedValue(new ApiError(429, null))
    renderPanel()

    await user.type(screen.getByLabelText(/무엇을 드셨나요/), '김밥')
    await user.click(screen.getByRole('button', { name: '분석하기' }))

    expect(await screen.findByText(/오늘 분석 횟수를 초과했어요/)).toBeInTheDocument()
    expect(screen.queryByText('분석 결과 확인')).not.toBeInTheDocument()
  })

  it('음식을 못 찾으면(NO_FOOD) 서버 안내를 그대로 보여준다', async () => {
    const user = userEvent.setup()
    pollAnalysisMock.mockResolvedValue({
      ...completed,
      status: 'NO_FOOD',
      result: { foodFound: false, items: [], overallConfidence: 0, notes: '음식을 찾지 못했어요.' },
    })
    renderPanel()

    await user.type(screen.getByLabelText(/무엇을 드셨나요/), '하늘')
    await user.click(screen.getByRole('button', { name: '분석하기' }))

    expect(await screen.findByText('음식을 찾지 못했어요.')).toBeInTheDocument()
  })

  it('분석이 실패하면 직접 입력을 안내한다', async () => {
    const user = userEvent.setup()
    pollAnalysisMock.mockRejectedValue(new Error('timeout'))
    renderPanel()

    await user.type(screen.getByLabelText(/무엇을 드셨나요/), '김밥')
    await user.click(screen.getByRole('button', { name: '분석하기' }))

    expect(await screen.findByText(/분석에 실패했어요/)).toBeInTheDocument()
  })

  it('"AI 없이 직접 입력하기"는 수동 입력으로 넘긴다', async () => {
    const user = userEvent.setup()
    const { onManual } = renderPanel()

    await user.click(screen.getByRole('button', { name: /AI 없이 직접 입력하기/ }))

    expect(onManual).toHaveBeenCalled()
  })
})

describe('사진 가져오기 경로', () => {
  it('눌러서 여는 입력에는 capture가 없다 — 있으면 카메라만 열려 사진첩을 못 고른다', () => {
    renderPanel()

    const inputs = [...document.querySelectorAll('input[type="file"]')]
    expect(inputs[0]).not.toHaveAttribute('capture')
  })

  it('FAB 경로용 입력은 capture를 갖는다 — 촬영이 바로 열려야 한다(design D13)', () => {
    renderPanel()

    const inputs = [...document.querySelectorAll('input[type="file"]')]
    expect(inputs[1]).toHaveAttribute('capture', 'environment')
  })

  it('FAB으로 들어오면 촬영 입력을 연다', () => {
    const clicked: string[] = []
    // 어느 입력이 열렸는지만 본다 — jsdom은 파일 대화상자를 띄우지 않는다
    const spy = vi
      .spyOn(HTMLInputElement.prototype, 'click')
      .mockImplementation(function (this: HTMLInputElement) {
        clicked.push(this.getAttribute('capture') ?? 'none')
      })

    render(
      <AiRecordPanel
        mealType="LUNCH"
        autoCamera
        onMealTypeChange={vi.fn()}
        onSave={vi.fn()}
        onManual={vi.fn()}
      />,
    )

    expect(clicked).toEqual(['environment'])
    spy.mockRestore()
  })
})
