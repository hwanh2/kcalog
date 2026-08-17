import { afterEach, describe, expect, it, vi } from 'vitest'
import { resetHapticsForTest, tapHaptic } from './haptics'

/** 숨겨둔 스위치 — 화면에 없으므로 DOM에서 직접 찾는다 */
function hidden() {
  return document.querySelector<HTMLInputElement>('input[type="checkbox"][switch]')
}

afterEach(() => {
  resetHapticsForTest()
  // jsdom에는 vibrate가 없다 — 테스트가 붙인 것만 걷어낸다
  delete (navigator as { vibrate?: unknown }).vibrate
})

describe('tapHaptic', () => {
  it('표준 API가 있으면 그것만 쓴다 — 편법은 iOS에서만 탄다', () => {
    const vibrate = vi.fn(() => true)
    Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true })

    tapHaptic()

    expect(vibrate).toHaveBeenCalledWith(10)
    expect(hidden()).toBeNull()
  })

  it('표준 API가 없으면(iOS) 숨은 스위치를 label로 토글한다', () => {
    tapHaptic()

    const input = hidden()
    expect(input).not.toBeNull()
    // 켜졌다는 것은 label 클릭이 컨트롤까지 닿았다는 뜻이다 — 직접 클릭하면 Taptic Engine이 안 돈다
    expect(input!.checked).toBe(true)

    tapHaptic()
    expect(hidden()!.checked).toBe(false) // 매번 상태가 바뀌어야 매번 울린다
  })

  it('여러 번 불러도 스위치는 하나만 둔다', () => {
    tapHaptic()
    tapHaptic()
    tapHaptic()

    expect(document.querySelectorAll('input[type="checkbox"][switch]')).toHaveLength(1)
  })

  it('스위치는 접근성 트리와 탭 순서에서 빠져 있다', () => {
    tapHaptic()

    const input = hidden()!
    expect(input.getAttribute('aria-hidden')).toBe('true')
    expect(input.tabIndex).toBe(-1)
    expect(input.closest('label')!.getAttribute('aria-hidden')).toBe('true')
  })

  it('표준 API가 false를 돌려주면(막힌 기기) 편법으로 넘어간다', () => {
    Object.defineProperty(navigator, 'vibrate', { value: () => false, configurable: true })

    tapHaptic()

    expect(hidden()).not.toBeNull()
  })
})
