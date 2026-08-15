import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteFavorite, getFoods, saveFavorite } from '../../api/food'
import type { Food } from '../../api/food'
import { AddFoodPanel } from './AddFoodPanel'

vi.mock('../../api/food', () => ({
  getFoods: vi.fn(),
  saveFavorite: vi.fn(),
  deleteFavorite: vi.fn(),
}))
// 즐겨찾기 탭에 세트 섹션이 붙는다 — 목킹하지 않으면 실제 fetch를 시도한다
vi.mock('../../api/favoriteMeal', () => ({
  getFavoriteMeals: vi.fn(() => Promise.resolve([])),
  deleteFavoriteMeal: vi.fn(),
}))
vi.mock('../meal/AiRecordPanel', () => ({
  AiRecordPanel: () => <div>AI 패널</div>, // 이 파일은 자주먹는·즐겨찾기만 다룬다
}))

const getFoodsMock = vi.mocked(getFoods)
const saveFavoriteMock = vi.mocked(saveFavorite)
const deleteFavoriteMock = vi.mocked(deleteFavorite)

const egg: Food = {
  id: 10,
  source: 'CATALOG',
  name: '삶은달걀',
  emoji: '🥚',
  aliases: ['계란'],
  quantity: 1,
  unit: '개',
  kcal: 70,
  carbG: 0.4,
  proteinG: 6.3,
  fatG: 4.8,
}

const savedEgg: Food = { ...egg, id: 99, source: 'FAVORITE', name: '삶은 달걀' } // 띄어쓰기 다른 같은 음식

function renderPanel(onRecordItems = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <AddFoodPanel mealType="BREAKFAST" onMealTypeChange={vi.fn()} onRecordItems={onRecordItems} />
    </QueryClientProvider>,
  )
  return { onRecordItems }
}

beforeEach(() => {
  vi.clearAllMocks()
  getFoodsMock.mockResolvedValue([egg])
  saveFavoriteMock.mockResolvedValue(savedEgg)
  deleteFavoriteMock.mockResolvedValue(undefined)
})

describe('즐겨찾기 저장', () => {
  it('★을 누르면 값을 확인하는 시트가 열리고, 저장하면 saveFavorite에 값이 전달된다', async () => {
    const user = userEvent.setup()
    renderPanel()

    await user.click(await screen.findByRole('button', { name: '삶은달걀 즐겨찾기에 저장' }))
    await user.click(screen.getByRole('button', { name: '즐겨찾기에 저장' }))

    await waitFor(() => expect(saveFavoriteMock).toHaveBeenCalled())
    expect(saveFavoriteMock.mock.calls[0][0]).toEqual(
      expect.objectContaining({ name: '삶은달걀', quantity: 1, unit: '개', kcal: 70 }),
    )
  })

  it('"AI 분석에도 반영"을 켜면 rememberForAnalysis=true로 전달된다', async () => {
    const user = userEvent.setup()
    renderPanel()

    await user.click(await screen.findByRole('button', { name: '삶은달걀 즐겨찾기에 저장' }))
    await user.click(screen.getByLabelText(/AI 분석에도 반영/))
    await user.click(screen.getByRole('button', { name: '즐겨찾기에 저장' }))

    await waitFor(() => expect(saveFavoriteMock).toHaveBeenCalled())
    expect(saveFavoriteMock.mock.calls[0][0].rememberForAnalysis).toBe(true)
  })

  it('켜지 않으면 rememberForAnalysis는 false — 담기 편하려고 누른 것이 분석을 바꾸지 않는다', async () => {
    const user = userEvent.setup()
    renderPanel()

    await user.click(await screen.findByRole('button', { name: '삶은달걀 즐겨찾기에 저장' }))
    await user.click(screen.getByRole('button', { name: '즐겨찾기에 저장' }))

    await waitFor(() => expect(saveFavoriteMock).toHaveBeenCalled())
    expect(saveFavoriteMock.mock.calls[0][0].rememberForAnalysis).toBe(false)
  })
})

describe('성공은 조용히, 실패만 알린다', () => {
  it('즐겨찾기에 저장해도 안내 문구가 뜨지 않는다 — ★ 변화가 곧 결과다', async () => {
    const user = userEvent.setup()
    renderPanel()

    await user.click(await screen.findByRole('button', { name: '삶은달걀 즐겨찾기에 저장' }))
    await user.click(screen.getByRole('button', { name: '즐겨찾기에 저장' }))

    await waitFor(() => expect(saveFavoriteMock).toHaveBeenCalled())
    expect(screen.queryByText(/즐겨찾기에 저장했어요/)).not.toBeInTheDocument()
  })

  it('저장이 실패하면 시트를 닫지 않고 알린다 — 입력한 값이 살아 있어야 한다', async () => {
    const user = userEvent.setup()
    saveFavoriteMock.mockRejectedValue(new Error('network'))
    renderPanel()

    await user.click(await screen.findByRole('button', { name: '삶은달걀 즐겨찾기에 저장' }))
    await user.click(screen.getByRole('button', { name: '즐겨찾기에 저장' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/저장하지 못했어요/)
    expect(screen.getByRole('button', { name: '즐겨찾기에 저장' })).toBeInTheDocument()
  })

  it('해제가 실패하면 알린다 — ★이 그대로인 이유를 알 수 있어야 한다', async () => {
    const user = userEvent.setup()
    getFoodsMock.mockResolvedValue([savedEgg])
    deleteFavoriteMock.mockRejectedValue(new Error('network'))
    renderPanel()

    await user.click(await screen.findByRole('button', { name: /즐겨찾기 해제/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/빼지 못했어요/)
  })
})

describe('즐겨찾기 해제', () => {
  it('이미 저장된 음식의 ★을 누르면 그 즐겨찾기를 삭제한다(띄어쓰기 차이 흡수)', async () => {
    const user = userEvent.setup()
    getFoodsMock.mockResolvedValue([savedEgg, egg]) // 즐겨찾기 + 같은 이름의 카탈로그 항목
    renderPanel()

    // 카탈로그 쪽 항목도 이미 저장된 것으로 보이므로 해제 버튼이 된다
    const buttons = await screen.findAllByRole('button', { name: /즐겨찾기 해제/ })
    await user.click(buttons[buttons.length - 1])

    // mutationFn에는 context가 함께 들어오므로 첫 인자만 본다
    await waitFor(() => expect(deleteFavoriteMock).toHaveBeenCalled())
    expect(deleteFavoriteMock.mock.calls[0][0]).toBe(99)
  })
})

describe('직접 입력', () => {
  it('검색 결과가 없을 때 직접 추가하면 그 값으로 기록을 만든다', async () => {
    const user = userEvent.setup()
    const { onRecordItems } = renderPanel()

    await user.type(await screen.findByLabelText('음식 이름 검색'), '짜장라면')
    await user.click(await screen.findByRole('button', { name: "'짜장라면' 직접 추가하기" }))

    await user.type(screen.getByLabelText('칼로리 (kcal)'), '600')
    await user.type(screen.getByLabelText('탄 (g)'), '80')
    await user.type(screen.getByLabelText('단 (g)'), '12')
    await user.type(screen.getByLabelText('지 (g)'), '20')
    await user.click(screen.getByRole('button', { name: '아침에 기록하기' }))

    expect(onRecordItems).toHaveBeenCalledWith([
      expect.objectContaining({ name: '짜장라면', kcal: '600', quantity: '1', unit: '인분' }),
    ])
  })

  it('필수 값이 비면 기록하지 않고 오류를 보여준다', async () => {
    const user = userEvent.setup()
    const { onRecordItems } = renderPanel()

    await user.type(await screen.findByLabelText('음식 이름 검색'), '짜장라면')
    await user.click(await screen.findByRole('button', { name: "'짜장라면' 직접 추가하기" }))
    await user.click(screen.getByRole('button', { name: '아침에 기록하기' }))

    expect(screen.getByText('0~10000 정수여야 합니다')).toBeInTheDocument()
    expect(onRecordItems).not.toHaveBeenCalled()
  })
})
