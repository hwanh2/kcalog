import { render, screen, waitFor } from '@testing-library/react'
import { act } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { TossNavigationBridge } from './TossNavigationBridge'

let pressAccessory: ((id: string) => void) | null = null

vi.mock('../platform', () => ({
  IS_TOSS: true,
  loadToss: () =>
    Promise.resolve({
      subscribeBack: () => () => {},
      subscribeAccessory: (onPress: (id: string) => void) => {
        pressAccessory = onPress
        return () => {}
      },
      closeApp: vi.fn(),
    }),
}))

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <TossNavigationBridge />
      <Routes>
        <Route path="/app" element={<div>홈 화면</div>} />
        <Route path="/app/profile" element={<div>프로필 화면</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('토스 내비바 기능 버튼', () => {
  it('프로필 버튼을 누르면 프로필 화면으로 간다', async () => {
    renderAt('/app')
    await waitFor(() => expect(pressAccessory).not.toBeNull())

    act(() => pressAccessory?.('profile'))

    expect(await screen.findByText('프로필 화면')).toBeInTheDocument()
  })
})
