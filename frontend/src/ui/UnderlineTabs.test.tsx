import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { UnderlineTabs } from './UnderlineTabs'

const ITEMS = [
  { id: 'a' as const, label: '아침' },
  { id: 'b' as const, label: '점심' },
  { id: 'c' as const, label: '저녁', badge: 2 },
  { id: 'd' as const, label: '간식' },
]

/** 밑줄은 장식(aria-hidden)이라 역할로 못 찾는다 — 그룹의 마지막 자식이다 */
function indicator(container: HTMLElement): HTMLElement | null {
  return container.querySelector('span[aria-hidden][style]')
}

describe('UnderlineTabs', () => {
  it('밑줄은 하나뿐이고 선택된 탭 자리로 옮겨간다', () => {
    const { container, rerender } = render(
      <UnderlineTabs label="끼니" items={ITEMS} selected="a" onSelect={() => {}} />,
    )

    // 탭이 넷이면 한 칸은 25%, 첫 칸은 제자리
    expect(indicator(container)!.style.width).toBe('25%')
    expect(indicator(container)!.style.transform).toBe('translateX(0%)')

    rerender(<UnderlineTabs label="끼니" items={ITEMS} selected="c" onSelect={() => {}} />)

    // 셋째 칸 = 두 칸 폭만큼 이동. 밑줄은 여전히 하나다
    expect(indicator(container)!.style.transform).toBe('translateX(200%)')
    expect(container.querySelectorAll('span[aria-hidden][style]')).toHaveLength(1)
  })

  it('선택이 목록에 없으면 밑줄을 그리지 않는다', () => {
    const { container } = render(
      <UnderlineTabs label="끼니" items={ITEMS} selected={'zz' as 'a'} onSelect={() => {}} />,
    )

    expect(indicator(container)).toBeNull()
  })

  it('탭을 누르면 그 id를 알린다', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<UnderlineTabs label="끼니" items={ITEMS} selected="a" onSelect={onSelect} />)

    await user.click(screen.getByRole('button', { name: /점심/ }))

    expect(onSelect).toHaveBeenCalledWith('b')
  })

  it('선택된 탭만 눌린 상태로 알린다', () => {
    render(<UnderlineTabs label="끼니" items={ITEMS} selected="b" onSelect={() => {}} />)

    expect(screen.getByRole('button', { name: /점심/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /아침/ })).toHaveAttribute('aria-pressed', 'false')
  })
})
