import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { FavoriteMeal } from '../../api/favoriteMeal'
import { FavoriteMealApplySheet } from './FavoriteMealApplySheet'

const SET: FavoriteMeal = {
  id: 1,
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

function renderSheet() {
  const onSubmit = vi.fn()
  render(
    <FavoriteMealApplySheet set={SET} mealType="LUNCH" onSubmit={onSubmit} onClose={vi.fn()} />,
  )
  return { onSubmit }
}

describe('세트 담기 시트', () => {
  it('든 음식과 합계를 보여준다', () => {
    renderSheet()

    expect(screen.getByText('잡곡밥')).toBeInTheDocument()
    expect(screen.getByText('미역국')).toBeInTheDocument()
    expect(screen.getByText('420 kcal')).toBeInTheDocument()
  })

  it('그대로 담으면 세트 구성 그대로 나간다', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderSheet()

    await user.click(screen.getByRole('button', { name: '점심에 기록하기' }))

    expect(onSubmit).toHaveBeenCalledTimes(1)
    const items = onSubmit.mock.calls[0][0]
    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({ name: '잡곡밥', kcal: '300', quantity: '1', unit: '공기' })
  })

  it('뺀 항목은 담기지 않는다 — 오늘은 국을 안 먹었을 수 있다', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderSheet()

    await user.click(screen.getByRole('button', { name: '미역국 빼기' }))
    await user.click(screen.getByRole('button', { name: '점심에 기록하기' }))

    const items = onSubmit.mock.calls[0][0]
    expect(items).toHaveLength(1)
    expect(items[0].name).toBe('잡곡밥')
  })

  it('뺀 항목은 되돌릴 수 있다', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderSheet()

    await user.click(screen.getByRole('button', { name: '미역국 빼기' }))
    await user.click(screen.getByRole('button', { name: '미역국 다시 담기' }))
    await user.click(screen.getByRole('button', { name: '점심에 기록하기' }))

    expect(onSubmit.mock.calls[0][0]).toHaveLength(2)
  })

  it('수량을 줄이면 영양값이 비례해 줄어든다 — 오늘은 밥을 반만 먹었다', async () => {
    const user = userEvent.setup()
    const { onSubmit } = renderSheet()

    // 공기 단위는 0.5씩 움직인다(stepFor) — 1 → 0.5
    await user.click(screen.getByRole('button', { name: '잡곡밥 수량 줄이기' }))
    await user.click(screen.getByRole('button', { name: '점심에 기록하기' }))

    expect(onSubmit.mock.calls[0][0][0]).toMatchObject({
      name: '잡곡밥',
      quantity: '0.5',
      kcal: '150', // 300의 절반
    })
  })

  it('전부 빼면 담을 수 없다', async () => {
    const user = userEvent.setup()
    renderSheet()

    await user.click(screen.getByRole('button', { name: '잡곡밥 빼기' }))
    await user.click(screen.getByRole('button', { name: '미역국 빼기' }))

    expect(screen.getByRole('button', { name: '담을 음식이 없어요' })).toBeDisabled()
  })
})
