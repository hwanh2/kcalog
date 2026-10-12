import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PrivacyPage } from './PrivacyPage'

const openExternal = vi.fn(() => Promise.resolve())

vi.mock('../platform', () => ({
  IS_TOSS: true,
  loadToss: () => Promise.resolve({ openExternal }),
}))

describe('개인정보 처리방침 (토스 빌드)', () => {
  it('연락처 메일 링크는 SDK의 openURL로 연다', async () => {
    render(<PrivacyPage />)

    await userEvent.click(screen.getByRole('link', { name: 'ymkim2353@gmail.com' }))

    await waitFor(() => expect(openExternal).toHaveBeenCalledWith('mailto:ymkim2353@gmail.com'))
  })
})
