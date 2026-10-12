import { render, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Sheet } from '../ui/Sheet'
import { handleBack, useBackHandler } from './backNavigation'

function deps(historyIndex: number) {
  return { historyIndex, goBack: vi.fn(), close: vi.fn() }
}

describe('토스 뒤로가기 처리 순서', () => {
  it('열린 시트가 있으면 화면을 옮기지 않고 시트부터 닫는다', () => {
    const onClose = vi.fn()
    render(
      <Sheet label="수량 담기" onClose={onClose}>
        <p>시트 내용</p>
      </Sheet>,
    )
    const d = deps(3)

    expect(handleBack(d)).toBe('dialog')
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(d.goBack).not.toHaveBeenCalled()
  })

  it('화면이 등록한 처리가 있으면 그것을 먼저 부른다', () => {
    const stepBack = vi.fn(() => true)
    const { unmount } = renderHook(() => useBackHandler(stepBack))
    const d = deps(0)

    expect(handleBack(d)).toBe('screen')
    expect(stepBack).toHaveBeenCalledTimes(1)
    expect(d.close).not.toHaveBeenCalled()
    unmount()
  })

  it('등록 해제된 처리는 부르지 않는다', () => {
    const stepBack = vi.fn(() => true)
    const { unmount } = renderHook(() => useBackHandler(stepBack))
    unmount()

    handleBack(deps(1))
    expect(stepBack).not.toHaveBeenCalled()
  })

  it('이전 화면이 있으면 돌아간다', () => {
    const d = deps(2)

    expect(handleBack(d)).toBe('history')
    expect(d.goBack).toHaveBeenCalledTimes(1)
  })

  it('첫 화면에서는 미니앱을 닫는다', () => {
    const d = deps(0)

    expect(handleBack(d)).toBe('close')
    expect(d.close).toHaveBeenCalledTimes(1)
    expect(d.goBack).not.toHaveBeenCalled()
  })
})
