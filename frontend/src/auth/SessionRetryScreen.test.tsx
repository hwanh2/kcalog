import { screen } from '@testing-library/react'
import { Route } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { renderWithAuth } from '../test/utils'
import { SessionRetryScreen } from './SessionRetryScreen'

const updateRequired = vi.hoisted(() => ({ value: false }))

vi.mock('../api/client', () => ({ isTossUpdateRequired: () => updateRequired.value }))

function renderScreen() {
  renderWithAuth(<Route path="/app" element={<SessionRetryScreen />} />, {
    state: { status: 'guest', member: null },
    path: '/app',
  })
}

describe('SessionRetryScreen', () => {
  it('일시적인 실패면 연결 끊김 안내를 보여 준다', () => {
    updateRequired.value = false
    renderScreen()

    expect(screen.getByRole('alert')).toHaveTextContent('연결이 잠시 끊겼어요')
  })

  it('토스 앱이 오래됐으면 업데이트를 안내한다', () => {
    updateRequired.value = true
    renderScreen()

    expect(screen.getByRole('alert')).toHaveTextContent('토스 앱 업데이트가 필요해요')
  })
})
