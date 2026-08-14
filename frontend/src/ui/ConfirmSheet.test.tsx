import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmSheet } from './ConfirmSheet'
import { Sheet } from './Sheet'

function renderConfirm(props: Partial<Parameters<typeof ConfirmSheet>[0]> = {}) {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()
  render(
    <ConfirmSheet
      title="이 기록을 지울까요?"
      description="되돌릴 수 없어요."
      detail="현미밥 1공기 · 310 kcal"
      confirmLabel="삭제"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...props}
    />,
  )
  return { onConfirm, onCancel }
}

describe('확인 시트', () => {
  it('무엇이 사라지는지 보여준다', () => {
    renderConfirm()

    expect(screen.getByText('이 기록을 지울까요?')).toBeInTheDocument()
    expect(screen.getByText('현미밥 1공기 · 310 kcal')).toBeInTheDocument()
  })

  it('실행을 누르면 그때 확인된다', async () => {
    const user = userEvent.setup()
    const { onConfirm } = renderConfirm()

    await user.click(screen.getByRole('button', { name: '삭제' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('취소하면 실행되지 않는다', async () => {
    const user = userEvent.setup()
    const { onConfirm, onCancel } = renderConfirm()

    await user.click(screen.getByRole('button', { name: '취소' }))

    expect(onCancel).toHaveBeenCalled()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('Esc로도 취소된다 — 실행이 기본이 되면 안 된다', async () => {
    const user = userEvent.setup()
    const { onConfirm, onCancel } = renderConfirm()

    await user.keyboard('{Escape}')

    expect(onCancel).toHaveBeenCalled()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('처음 포커스가 실행 버튼에 놓이지 않는다 — 엔터 한 번에 지워지면 안 된다', () => {
    renderConfirm()

    expect(screen.getByRole('button', { name: '삭제' })).not.toHaveFocus()
  })

  it('실패하면 시트를 닫지 않고 알린다', () => {
    renderConfirm({ error: '기록을 지우지 못했어요.' })

    expect(screen.getByRole('alert')).toHaveTextContent('기록을 지우지 못했어요.')
    expect(screen.getByRole('button', { name: '삭제' })).toBeInTheDocument() // 재시도할 수 있다
  })
})

/** 분석 결과 시트 안에서 확인 시트가 열리는 실제 중첩 구조 */
function NestedHost({ onOuterClose }: { onOuterClose: () => void }) {
  const [confirming, setConfirming] = useState(false)
  return (
    <Sheet label="분석 결과" onClose={onOuterClose}>
      <button type="button" onClick={() => setConfirming(true)}>
        삭제
      </button>
      {confirming && (
        <ConfirmSheet
          title="지울까요?"
          description="되돌릴 수 없어요."
          confirmLabel="삭제"
          onConfirm={vi.fn()}
          onCancel={() => setConfirming(false)}
        />
      )}
    </Sheet>
  )
}

describe('중첩된 확인 시트', () => {
  it('Esc가 확인만 닫고 바깥 시트는 남긴다', async () => {
    const user = userEvent.setup()
    const onOuterClose = vi.fn()
    render(<NestedHost onOuterClose={onOuterClose} />)

    await user.click(screen.getByRole('button', { name: '삭제' }))
    await user.keyboard('{Escape}')

    expect(onOuterClose).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: '분석 결과' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: '지울까요?' })).not.toBeInTheDocument()
  })
})
