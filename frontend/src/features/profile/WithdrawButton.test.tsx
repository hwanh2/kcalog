import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const withdraw = vi.fn<() => Promise<void>>()
const closeApp = vi.fn(() => Promise.resolve())
const platform = vi.hoisted(() => ({ isToss: false }))

vi.mock('../../api/member', () => ({ withdraw: () => withdraw() }))
vi.mock('../../platform', () => ({
  get IS_TOSS() {
    return platform.isToss
  },
  loadToss: () => Promise.resolve({ closeApp }),
}))

const { WithdrawButton } = await import('./WithdrawButton')

beforeEach(() => {
  withdraw.mockReset()
  closeApp.mockClear()
  vi.stubGlobal('location', { assign: vi.fn() })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

async function confirmWithdraw() {
  render(<WithdrawButton />)
  await userEvent.click(screen.getByRole('button', { name: '회원 탈퇴' }))
  await userEvent.click(screen.getByRole('button', { name: '탈퇴하기' }))
}

describe('회원 탈퇴', () => {
  it('확인 시트를 거쳐야 탈퇴한다', async () => {
    render(<WithdrawButton />)
    await userEvent.click(screen.getByRole('button', { name: '회원 탈퇴' }))

    expect(screen.getByText('정말 탈퇴할까요?')).toBeInTheDocument()
    expect(withdraw).not.toHaveBeenCalled()
  })

  it('웹은 탈퇴 후 랜딩으로 새로 읽어 들인다', async () => {
    platform.isToss = false
    withdraw.mockResolvedValueOnce()

    await confirmWithdraw()

    await waitFor(() => expect(location.assign).toHaveBeenCalledWith('/'))
    expect(closeApp).not.toHaveBeenCalled()
  })

  it('토스 빌드는 탈퇴 후 미니앱을 닫는다', async () => {
    platform.isToss = true
    withdraw.mockResolvedValueOnce()

    await confirmWithdraw()

    await waitFor(() => expect(closeApp).toHaveBeenCalledTimes(1))
    expect(location.assign).not.toHaveBeenCalled()
  })

  it('실패하면 시트를 연 채 다시 시도할 수 있게 알린다', async () => {
    platform.isToss = false
    withdraw.mockRejectedValueOnce(new Error('500'))

    await confirmWithdraw()

    expect(await screen.findByText('탈퇴하지 못했어요. 잠시 후 다시 시도해주세요.')).toBeInTheDocument()
    expect(location.assign).not.toHaveBeenCalled()
  })
})
