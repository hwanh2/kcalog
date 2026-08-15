import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getFavoriteMeals, saveFavoriteMeal } from '../../api/favoriteMeal'
import type { FavoriteMeal, FavoriteMealItem } from '../../api/favoriteMeal'
import { FavoriteMealSaveSheet } from './FavoriteMealSaveSheet'

vi.mock('../../api/favoriteMeal', () => ({
  getFavoriteMeals: vi.fn(),
  saveFavoriteMeal: vi.fn(),
}))
const getMock = vi.mocked(getFavoriteMeals)
const saveMock = vi.mocked(saveFavoriteMeal)

const ITEMS: FavoriteMealItem[] = [
  { name: '잡곡밥', quantity: 1, unit: '공기', kcal: 300, carbG: 70, proteinG: 7, fatG: 2 },
  { name: '미역국', quantity: 1, unit: '그릇', kcal: 120, carbG: 6, proteinG: 16, fatG: 10 },
]

const EXISTING: FavoriteMeal = {
  id: 1,
  name: '회사 점심 A',
  itemCount: 2,
  totalKcal: 420,
  carbG: 76,
  proteinG: 23,
  fatG: 12,
  items: ITEMS,
}

function renderSheet(items = ITEMS) {
  const onSaved = vi.fn()
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <FavoriteMealSaveSheet items={items} onSaved={onSaved} onClose={vi.fn()} />
    </QueryClientProvider>,
  )
  return { onSaved }
}

beforeEach(() => {
  vi.clearAllMocks()
  getMock.mockResolvedValue([])
  saveMock.mockResolvedValue(EXISTING)
})

describe('세트 저장 시트', () => {
  it('이름을 항목에서 만들어 미리 채운다 — 필수 입력이면 "빨리 담기"와 어긋난다', () => {
    renderSheet()

    expect(screen.getByLabelText('세트 이름')).toHaveValue('잡곡밥 외 1개')
  })

  it('담긴 음식과 합계를 보여준다', () => {
    renderSheet()

    expect(screen.getByText('담긴 음식 2개')).toBeInTheDocument()
    expect(screen.getByText('420 kcal')).toBeInTheDocument()
  })

  it('고친 이름으로 저장한다', async () => {
    const user = userEvent.setup()
    renderSheet()

    const field = screen.getByLabelText('세트 이름')
    await user.clear(field)
    await user.type(field, '회사 점심 A')
    await user.click(screen.getByRole('button', { name: '저장' }))

    // 첫 인자만 본다 — TanStack Query가 mutationFn에 (variables, context)를 넘긴다
    await waitFor(() => expect(saveMock).toHaveBeenCalled())
    expect(saveMock.mock.calls[0][0]).toEqual({ name: '회사 점심 A', items: ITEMS })
  })

  it('이름이 비면 저장하지 않고 알린다', async () => {
    const user = userEvent.setup()
    renderSheet()

    await user.clear(screen.getByLabelText('세트 이름'))
    await user.click(screen.getByRole('button', { name: '저장' }))

    expect(screen.getByRole('alert')).toHaveTextContent('이름을 입력해주세요')
    expect(saveMock).not.toHaveBeenCalled()
  })

  it('같은 이름이 이미 있으면 덮어쓴다고 미리 알린다 — 조용히 지우면 안 된다', async () => {
    // 기본 이름("잡곡밥 외 1개")과 겹치는 세트가 이미 있는 상황
    getMock.mockResolvedValue([{ ...EXISTING, name: '잡곡밥 외 1개' }])
    renderSheet()

    expect(await screen.findByText(/이미 있는 이름이에요/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '덮어쓰기' })).toBeInTheDocument()
  })

  it('띄어쓰기만 달라도 같은 이름으로 본다 — 서버 정규화 규칙과 같아야 한다', async () => {
    getMock.mockResolvedValue([{ ...EXISTING, name: '회사점심a' }])
    const user = userEvent.setup()
    renderSheet()

    const field = screen.getByLabelText('세트 이름')
    await user.clear(field)
    await user.type(field, '회사 점심 A')

    expect(await screen.findByText(/이미 있는 이름이에요/)).toBeInTheDocument()
  })

  it('저장에 실패하면 알린다', async () => {
    saveMock.mockRejectedValue(new Error('network'))
    const user = userEvent.setup()
    const { onSaved } = renderSheet()

    await user.click(screen.getByRole('button', { name: '저장' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/저장하지 못했어요/)
    expect(onSaved).not.toHaveBeenCalled()
  })
})
