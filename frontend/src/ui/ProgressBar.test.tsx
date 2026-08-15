import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProgressBar } from './ProgressBar'

/** 채움은 트랙 안의 유일한 자식이다 */
function fill(container: HTMLElement): HTMLElement {
  return container.firstElementChild!.firstElementChild as HTMLElement
}

describe('ProgressBar', () => {
  it('값만큼 채운다 — 트랙 폭 전체를 왼쪽으로 밀어 넣는다', () => {
    const { container } = render(<ProgressBar value={30} barClass="bg-carb" />)

    // 30%면 70%만큼 왼쪽으로 밀려 있다
    expect(fill(container).style.transform).toBe('translateX(-70%)')
  })

  it('가득 차면 밀지 않는다', () => {
    const { container } = render(<ProgressBar value={100} barClass="bg-carb" />)

    expect(fill(container).style.transform).toBe('translateX(0%)')
  })

  it('비어 있으면 통째로 밀어낸다', () => {
    const { container } = render(<ProgressBar value={0} barClass="bg-carb" />)

    expect(fill(container).style.transform).toBe('translateX(-100%)')
  })

  /** 진행률 계산이 100을 넘겨 들어와도(초과 섭취) 바가 트랙 밖으로 나가지 않아야 한다 */
  it('범위 밖 값은 잘라 쓴다', () => {
    const { container: over } = render(<ProgressBar value={140} barClass="bg-carb" />)
    const { container: under } = render(<ProgressBar value={-20} barClass="bg-carb" />)

    expect(fill(over).style.transform).toBe('translateX(0%)')
    expect(fill(under).style.transform).toBe('translateX(-100%)')
  })

  it('채움은 트랙 폭 전체를 갖는다 — 끝의 라운드가 눌리지 않게 미는 방식이다', () => {
    const { container } = render(<ProgressBar value={30} barClass="bg-carb" />)

    expect(fill(container).className).toContain('w-full')
    expect(fill(container).className).not.toContain('scale-x')
  })
})
