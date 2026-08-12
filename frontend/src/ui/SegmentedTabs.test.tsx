import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SegmentedTabs } from './SegmentedTabs'

const ITEMS = [
  { id: 'BREAKFAST' as const, label: '아침', badge: 2 },
  { id: 'LUNCH' as const, label: '점심' },
]

function renderTabs(selected: 'BREAKFAST' | 'LUNCH' = 'BREAKFAST') {
  const onSelect = vi.fn()
  render(<SegmentedTabs label="끼니" items={ITEMS} selected={selected} onSelect={onSelect} />)
  return { onSelect }
}

describe('세그먼트 접근성', () => {
  it('탭이 아니라 눌림 상태를 가진 버튼으로 노출된다', () => {
    renderTabs()

    // tabs 패턴은 aria-controls·화살표 이동까지가 한 세트다. 반만 구현하느니 버튼으로 알린다.
    expect(screen.queryAllByRole('tab')).toHaveLength(0)
    expect(screen.getByRole('button', { name: /아침/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /점심/ })).toHaveAttribute('aria-pressed', 'false')
  })

  it('선택이 바뀌면 눌림 상태도 따라간다', () => {
    renderTabs('LUNCH')

    expect(screen.getByRole('button', { name: /점심/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('묶음에 이름이 붙어 있다 — 무엇을 고르는 버튼들인지 알 수 있게', () => {
    renderTabs()

    expect(screen.getByRole('group', { name: '끼니' })).toBeInTheDocument()
  })

  it('누르면 그 끼니를 넘긴다', async () => {
    const user = userEvent.setup()
    const { onSelect } = renderTabs()

    await user.click(screen.getByRole('button', { name: /점심/ }))

    expect(onSelect).toHaveBeenCalledWith('LUNCH')
  })
})
