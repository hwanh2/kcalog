import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ItemEditSheet } from './ItemEditSheet'
import type { EditableItem } from './mealItems'

const item = (over: Partial<EditableItem> = {}): EditableItem => ({
  name: '김치찌개',
  kcal: '400',
  carbG: '30',
  proteinG: '20',
  fatG: '18',
  box: null,
  remember: false,
  corrected: false,
  ...over,
})

function renderSheet(over: Partial<EditableItem> = {}, onChange = vi.fn()) {
  render(
    <ItemEditSheet
      item={item(over)}
      errors={{}}
      onChange={onChange}
      onDelete={vi.fn()}
      onClose={vi.fn()}
    />,
  )
  return onChange
}

describe('ItemEditSheet — 개인 보정', () => {
  it('"이 값 기억하기"를 켜면 remember=true로 onChange한다', async () => {
    const onChange = renderSheet()
    await userEvent.click(screen.getByLabelText(/이 값 기억하기/))
    expect(onChange).toHaveBeenCalledWith({ remember: true })
  })

  it('보정된 항목은 "내 값 적용됨" 배지를 보여준다', () => {
    renderSheet({ corrected: true })
    expect(screen.getByText(/내 값 적용됨/)).toBeInTheDocument()
  })

  it('보정되지 않은 항목엔 배지가 없다', () => {
    renderSheet({ corrected: false })
    expect(screen.queryByText(/내 값 적용됨/)).not.toBeInTheDocument()
  })
})
