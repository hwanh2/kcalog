import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { useRef } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { usePullToRefresh } from './usePullToRefresh'

function Host({ onRefresh, children }: { onRefresh: () => Promise<unknown>; children?: React.ReactNode }) {
  const ref = useRef<HTMLElement>(null)
  const pull = usePullToRefresh(ref, onRefresh)
  return (
    <main ref={ref} data-testid="main">
      <p data-testid="state">{`${Math.round(pull.distance)}|${pull.armed}|${pull.refreshing}`}</p>
      {children}
    </main>
  )
}

/** 터치 한 점짜리 이벤트 — clientY만 쓰인다 */
function touch(y: number) {
  return { touches: [{ clientY: y }] }
}

function state() {
  return screen.getByTestId('state').textContent
}

afterEach(() => {
  window.scrollY = 0
})

describe('usePullToRefresh', () => {
  it('아래로 당기면 절반만 따라오고, 임계점을 넘기면 놓으라고 알린다', () => {
    render(<Host onRefresh={() => Promise.resolve()} />)
    const main = screen.getByTestId('main')

    fireEvent.touchStart(main, touch(0))
    fireEvent.touchMove(main, touch(60))
    // 저항 0.5 — 60px 당기면 30px 내려온다. 아직 임계점(64) 아래
    expect(state()).toBe('30|false|false')

    fireEvent.touchMove(main, touch(200))
    // 최대 96px에서 멈춘다(200 × 0.5 = 100 > 96)
    expect(state()).toBe('96|true|false')
  })

  it('임계점을 넘겨 놓으면 새로고침한다', async () => {
    const onRefresh = vi.fn(() => Promise.resolve())
    render(<Host onRefresh={onRefresh} />)
    const main = screen.getByTestId('main')

    fireEvent.touchStart(main, touch(0))
    fireEvent.touchMove(main, touch(200))
    fireEvent.touchEnd(main)

    expect(onRefresh).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(state()).toBe('0|false|false'))
  })

  it('임계점에 못 미치면 새로고침하지 않고 되돌아간다', () => {
    const onRefresh = vi.fn(() => Promise.resolve())
    render(<Host onRefresh={onRefresh} />)
    const main = screen.getByTestId('main')

    fireEvent.touchStart(main, touch(0))
    fireEvent.touchMove(main, touch(60)) // 30px — 부족
    fireEvent.touchEnd(main)

    expect(onRefresh).not.toHaveBeenCalled()
    expect(state()).toBe('0|false|false')
  })

  it('위로 올리면 평범한 스크롤로 돌려준다', () => {
    const onRefresh = vi.fn(() => Promise.resolve())
    render(<Host onRefresh={onRefresh} />)
    const main = screen.getByTestId('main')

    fireEvent.touchStart(main, touch(100))
    fireEvent.touchMove(main, touch(40)) // 위로
    fireEvent.touchEnd(main)

    expect(onRefresh).not.toHaveBeenCalled()
    expect(state()).toBe('0|false|false')
  })

  /** 목록 중간에서 당기는 것은 스크롤이다 — 여기서 새로고침되면 읽던 자리를 잃는다 */
  it('맨 위가 아니면 시작하지 않는다', () => {
    window.scrollY = 200
    expect(window.scrollY).toBe(200) // jsdom에서 실제로 바뀌는지 — 안 바뀌면 이 테스트는 헛통과다
    const onRefresh = vi.fn(() => Promise.resolve())
    render(<Host onRefresh={onRefresh} />)
    const main = screen.getByTestId('main')

    fireEvent.touchStart(main, touch(0))
    fireEvent.touchMove(main, touch(200))
    fireEvent.touchEnd(main)

    expect(state()).toBe('0|false|false')
    expect(onRefresh).not.toHaveBeenCalled()
  })

  /** 시트는 화면 위에 떠 있어 뒤 문서는 맨 위지만, 뒤 화면을 새로고침할 이유는 없다 */
  it('시트 안에서 당기면 무시한다', () => {
    const onRefresh = vi.fn(() => Promise.resolve())
    render(
      <Host onRefresh={onRefresh}>
        <div role="dialog">
          <button data-testid="in-sheet">시트 안</button>
        </div>
      </Host>,
    )
    const inSheet = screen.getByTestId('in-sheet')

    fireEvent.touchStart(inSheet, touch(0))
    fireEvent.touchMove(inSheet, touch(200))
    fireEvent.touchEnd(inSheet)

    expect(state()).toBe('0|false|false')
    expect(onRefresh).not.toHaveBeenCalled()
  })

  it('새로고침이 도는 동안 다시 당겨도 겹쳐 부르지 않는다', async () => {
    let release: () => void = () => {}
    const onRefresh = vi.fn(() => new Promise<void>((resolve) => (release = resolve)))
    render(<Host onRefresh={onRefresh} />)
    const main = screen.getByTestId('main')

    fireEvent.touchStart(main, touch(0))
    fireEvent.touchMove(main, touch(200))
    fireEvent.touchEnd(main)
    // 도는 동안은 내용을 가리지 않는 자리(52px)에 세워둔다 — 임계점(64)이 아니다
    await waitFor(() => expect(state()).toBe('52|false|true'))

    fireEvent.touchStart(main, touch(0))
    fireEvent.touchMove(main, touch(200))
    fireEvent.touchEnd(main)
    expect(onRefresh).toHaveBeenCalledTimes(1)

    release()
    await waitFor(() => expect(state()).toBe('0|false|false'))
  })

  it('새로고침이 실패해도 표시는 걷힌다 — 안 걷히면 화면이 잠긴 것처럼 보인다', async () => {
    const onRefresh = vi.fn(() => Promise.reject(new Error('끊김')))
    render(<Host onRefresh={onRefresh} />)
    const main = screen.getByTestId('main')

    fireEvent.touchStart(main, touch(0))
    fireEvent.touchMove(main, touch(200))
    fireEvent.touchEnd(main)

    await waitFor(() => expect(state()).toBe('0|false|false'))
  })
})
