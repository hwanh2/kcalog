import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteFavoriteMeal, getFavoriteMeals } from '../../api/favoriteMeal'
import type { FavoriteMeal } from '../../api/favoriteMeal'
import { FavoriteMealSection } from './FavoriteMealSection'

vi.mock('../../api/favoriteMeal', () => ({
  getFavoriteMeals: vi.fn(),
  deleteFavoriteMeal: vi.fn(),
}))
const getMock = vi.mocked(getFavoriteMeals)
const deleteMock = vi.mocked(deleteFavoriteMeal)

const SET: FavoriteMeal = {
  id: 7,
  name: '회사 점심 A',
  itemCount: 2,
  totalKcal: 420,
  carbG: 76,
  proteinG: 23,
  fatG: 12,
  items: [
    { name: '잡곡밥', quantity: 1, unit: '공기', kcal: 300, carbG: 70, proteinG: 7, fatG: 2 },
    { name: '미역국', quantity: 1, unit: '그릇', kcal: 120, carbG: 6, proteinG: 16, fatG: 10 },
  ],
}

function renderSection() {
  const onRecordItems = vi.fn()
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <FavoriteMealSection mealType="LUNCH" onMealTypeChange={vi.fn()} onRecordItems={onRecordItems} />
    </QueryClientProvider>,
  )
  return { onRecordItems }
}

beforeEach(() => {
  vi.clearAllMocks()
  getMock.mockResolvedValue([SET])
  deleteMock.mockResolvedValue(undefined)
})

describe('내 세트 섹션', () => {
  it('세트의 이름·항목 수·합계를 보여준다 — 담기 전에 무엇인지 알아야 한다', async () => {
    renderSection()

    expect(await screen.findByText('회사 점심 A')).toBeInTheDocument()
    expect(screen.getByText(/음식 2개 · 420 kcal/)).toBeInTheDocument()
  })

  it('세트가 없으면 아무것도 그리지 않는다 — 빈 자리가 음식 목록을 밀어내면 손해다', async () => {
    getMock.mockResolvedValue([])
    renderSection()

    await waitFor(() => expect(getMock).toHaveBeenCalled())
    expect(screen.queryByRole('region', { name: '내 세트' })).not.toBeInTheDocument()
  })

  it('담기는 + 버튼이다 — 줄 전체가 아니라, 아래 음식 목록과 같은 모양', async () => {
    renderSection()

    const add = await screen.findByRole('button', { name: '회사 점심 A 담기' })
    expect(add).toHaveTextContent('+')
    // 이름은 버튼 안이 아니라 밖에 있다 — 줄이 통째로 버튼이면 휴지통이 버튼 안 버튼이 된다
    expect(add).not.toHaveTextContent('회사 점심 A')
    expect(screen.getByRole('button', { name: '회사 점심 A 세트 삭제' })).toBeInTheDocument()
  })

  it('세트를 누르면 담기 시트가 열린다', async () => {
    const user = userEvent.setup()
    renderSection()

    await user.click(await screen.findByRole('button', { name: '회사 점심 A 담기' }))

    expect(screen.getByRole('dialog', { name: '회사 점심 A 담기' })).toBeInTheDocument()
  })

  it('담으면 항목이 부모로 넘어간다', async () => {
    const user = userEvent.setup()
    const { onRecordItems } = renderSection()

    await user.click(await screen.findByRole('button', { name: '회사 점심 A 담기' }))
    await user.click(screen.getByRole('button', { name: '기록하기' }))

    expect(onRecordItems).toHaveBeenCalledTimes(1)
    expect(onRecordItems.mock.calls[0][0]).toHaveLength(2)
  })

  it('확인 전에는 삭제 요청이 나가지 않는다', async () => {
    const user = userEvent.setup()
    renderSection()

    await user.click(await screen.findByRole('button', { name: '회사 점심 A 세트 삭제' }))

    expect(screen.getByRole('dialog', { name: /지울까요/ })).toBeInTheDocument()
    expect(deleteMock).not.toHaveBeenCalled()
  })

  it('확인하면 지운다', async () => {
    const user = userEvent.setup()
    renderSection()

    await user.click(await screen.findByRole('button', { name: '회사 점심 A 세트 삭제' }))
    await user.click(screen.getByRole('button', { name: '삭제' }))

    await waitFor(() => expect(deleteMock).toHaveBeenCalled())
    expect(deleteMock.mock.calls[0][0]).toBe(7)
  })

  it('삭제에 실패하면 알린다', async () => {
    deleteMock.mockRejectedValue(new Error('network'))
    const user = userEvent.setup()
    renderSection()

    await user.click(await screen.findByRole('button', { name: '회사 점심 A 세트 삭제' }))
    await user.click(screen.getByRole('button', { name: '삭제' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/지우지 못했어요/)
  })
})
