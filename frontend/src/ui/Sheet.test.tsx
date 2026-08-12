import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Sheet } from './Sheet'

/** 시트를 여는 버튼이 있는 화면 — 포커스 복귀를 확인하려면 "연 요소"가 있어야 한다 */
function Host({ onClose }: { onClose?: () => void }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        시트 열기
      </button>
      <button type="button">뒤 배경 버튼</button>
      {open && (
        <Sheet
          label="수량 담기"
          onClose={() => {
            setOpen(false)
            onClose?.()
          }}
        >
          <p>시트 내용</p>
          <button type="button">기록하기</button>
        </Sheet>
      )}
    </>
  )
}

async function open(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: '시트 열기' }))
}

describe('바텀시트 키보드 규약', () => {
  it('열면 포커스가 시트 안으로 들어간다', async () => {
    const user = userEvent.setup()
    render(<Host />)

    await open(user)

    expect(screen.getByRole('button', { name: '닫기' })).toHaveFocus()
  })

  it('Esc로 닫힌다', async () => {
    const user = userEvent.setup()
    render(<Host />)
    await open(user)

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('닫으면 포커스가 시트를 연 버튼으로 돌아간다', async () => {
    const user = userEvent.setup()
    render(<Host />)
    await open(user)

    await user.keyboard('{Escape}')

    expect(screen.getByRole('button', { name: '시트 열기' })).toHaveFocus()
  })

  it('탭이 시트 안에서만 돌고 뒤 배경으로 나가지 않는다', async () => {
    const user = userEvent.setup()
    render(<Host />)
    await open(user)

    const background = screen.getByRole('button', { name: '뒤 배경 버튼' })
    // 시트 안 요소는 닫기·기록하기 둘뿐 — 몇 번을 돌려도 배경에 닿지 않아야 한다
    for (let i = 0; i < 5; i++) {
      await user.tab()
      expect(background).not.toHaveFocus()
    }
  })

  it('shift+탭으로 거꾸로 돌아도 시트를 벗어나지 않는다', async () => {
    const user = userEvent.setup()
    render(<Host />)
    await open(user)

    const background = screen.getByRole('button', { name: '뒤 배경 버튼' })
    for (let i = 0; i < 5; i++) {
      await user.tab({ shift: true })
      expect(background).not.toHaveFocus()
    }
  })
})

describe('바텀시트 접근성 트리', () => {
  it('화면을 덮는 딤이 버튼으로 노출되지 않는다', async () => {
    const user = userEvent.setup()
    render(<Host />)
    await open(user)

    // 닫기는 시트 안의 버튼 하나뿐 — 딤이 또 하나의 "닫기"가 되면 안 된다
    expect(screen.getAllByRole('button', { name: '닫기' })).toHaveLength(1)
  })

  it('딤을 누르면 닫힌다 — 마우스 사용자의 편의는 유지한다', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<Host onClose={onClose} />)
    await open(user)

    // aria-hidden이라 역할로 못 찾는다 — 실제 DOM에서 집는다
    const dim = document.querySelector('.bg-black\\/40') as HTMLElement
    await user.click(dim)

    expect(onClose).toHaveBeenCalled()
  })
})

/** 분석 결과 시트 안에서 항목 편집 시트를 여는 실제 구조 */
function NestedHost({ onOuterClose, onInnerClose }: { onOuterClose: () => void; onInnerClose: () => void }) {
  const [outer, setOuter] = useState(false)
  const [inner, setInner] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOuter(true)}>
        바깥 열기
      </button>
      {outer && (
        <Sheet
          label="분석 결과"
          onClose={() => {
            setOuter(false)
            onOuterClose()
          }}
        >
          <p>바깥 내용</p>
          <button type="button" onClick={() => setInner(true)}>
            항목 편집
          </button>
          {inner && (
            <Sheet
              label="음식 편집"
              onClose={() => {
                setInner(false)
                onInnerClose()
              }}
            >
              <button type="button">완료</button>
            </Sheet>
          )}
        </Sheet>
      )}
    </>
  )
}

describe('중첩된 시트', () => {
  it('Esc는 맨 위 시트만 닫는다 — 바깥까지 닫히면 편집하던 내용이 사라진다', async () => {
    const user = userEvent.setup()
    const onOuterClose = vi.fn()
    const onInnerClose = vi.fn()
    render(<NestedHost onOuterClose={onOuterClose} onInnerClose={onInnerClose} />)

    await user.click(screen.getByRole('button', { name: '바깥 열기' }))
    await user.click(screen.getByRole('button', { name: '항목 편집' }))

    await user.keyboard('{Escape}')

    expect(onInnerClose).toHaveBeenCalledTimes(1)
    expect(onOuterClose).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: '분석 결과' })).toBeInTheDocument()
  })

  it('안쪽을 닫은 뒤 Esc를 다시 누르면 그때 바깥이 닫힌다', async () => {
    const user = userEvent.setup()
    const onOuterClose = vi.fn()
    render(<NestedHost onOuterClose={onOuterClose} onInnerClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: '바깥 열기' }))
    await user.click(screen.getByRole('button', { name: '항목 편집' }))
    await user.keyboard('{Escape}')
    await user.keyboard('{Escape}')

    expect(onOuterClose).toHaveBeenCalledTimes(1)
  })

  it('안쪽이 닫혀도 바깥이 열려 있는 동안 배경 스크롤은 잠긴 채다', async () => {
    const user = userEvent.setup()
    render(<NestedHost onOuterClose={vi.fn()} onInnerClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: '바깥 열기' }))
    await user.click(screen.getByRole('button', { name: '항목 편집' }))
    await user.keyboard('{Escape}') // 안쪽만 닫힘

    expect(document.body.style.overflow).toBe('hidden')

    await user.keyboard('{Escape}') // 바깥까지 닫힘
    expect(document.body.style.overflow).not.toBe('hidden')
  })
})

describe('바텀시트 배경 스크롤', () => {
  it('열려 있는 동안 뒤 페이지 스크롤을 잠그고, 닫으면 되돌린다', async () => {
    const user = userEvent.setup()
    render(<Host />)

    await open(user)
    expect(document.body.style.overflow).toBe('hidden')

    await user.keyboard('{Escape}')
    expect(document.body.style.overflow).not.toBe('hidden')
  })
})
