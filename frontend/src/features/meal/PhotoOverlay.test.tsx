import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PhotoOverlay } from './PhotoOverlay'
import type { EditableItem } from './mealItems'

/** x 위치만 다른 항목 — 가로 배치 판정만 본다 */
function itemAt(name: string, x: number): EditableItem {
  return {
    name,
    kcal: '100',
    carbG: '10',
    proteinG: '5',
    fatG: '3',
    quantity: '1',
    unit: '인분',
    corrected: false,
    remember: false,
    box: { x, y: 0.5, w: 0.1, h: 0.1 },
  }
}

function renderOverlay(items: EditableItem[]) {
  render(<PhotoOverlay src="blob:photo" items={items} onSelect={vi.fn()} />)
}

describe('배지가 사진 밖으로 나가지 않는다', () => {
  it('왼쪽 끝 음식의 배지는 사진 왼쪽에 붙인다 — 가운데 맞추면 절반이 잘린다', () => {
    renderOverlay([itemAt('고추장 채소무침 추정', 0.02)])

    const badge = screen.getByRole('button', { name: /고추장 채소무침 추정 편집/ })
    expect(badge).toHaveStyle({ left: '0.5rem' })
    expect(badge).not.toHaveClass('-translate-x-1/2')
  })

  it('오른쪽 끝 음식의 배지는 사진 오른쪽에 붙인다', () => {
    renderOverlay([itemAt('국탕 미역 고기 추정', 0.88)])

    const badge = screen.getByRole('button', { name: /국탕 미역 고기 추정 편집/ })
    expect(badge).toHaveStyle({ right: '0.5rem' })
    expect(badge).not.toHaveClass('-translate-x-1/2')
  })

  it('가운데 음식은 그대로 가운데 맞춘다', () => {
    renderOverlay([itemAt('잡곡밥', 0.45)])

    const badge = screen.getByRole('button', { name: /잡곡밥 편집/ })
    expect(badge).toHaveClass('-translate-x-1/2')
    expect(badge).toHaveStyle({ left: '50%' })
  })

  it('가운데 맞춤 배지는 가까운 쪽 여백의 2배까지만 넓어진다 — 넓으면 한쪽으로 삐져나간다', () => {
    // 중심 30% → 왼쪽 여백이 30%뿐이므로 최대 60%. 가장자리 판정(22%)만으로는 못 막는 구간이다.
    renderOverlay([itemAt('아주 긴 이름의 반찬 고추장 채소무침 추정입니다', 0.25)])

    const badge = screen.getByRole('button', { name: /편집/ })
    expect(badge).toHaveStyle({ maxWidth: 'calc(60.00% - 0.5rem)' })
  })

  it('끝에 붙인 배지는 사진 폭에서 여백만 뺀다 — 한 방향으로만 뻗는다', () => {
    renderOverlay([itemAt('고추장 채소무침', 0.02)])

    const badge = screen.getByRole('button', { name: /편집/ })
    expect(badge).toHaveStyle({ maxWidth: 'calc(100% - 0.5rem)' })
  })

  it('box가 없는 항목은 배지를 그리지 않는다', () => {
    renderOverlay([{ ...itemAt('박스 없음', 0.5), box: null }])

    expect(screen.queryByRole('button', { name: /박스 없음 편집/ })).not.toBeInTheDocument()
  })
})
