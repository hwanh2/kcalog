import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PrivacyPage } from './PrivacyPage'

describe('개인정보 처리방침', () => {
  it('국외 이전 대상과 연락처, 탈퇴 시 삭제를 밝힌다', () => {
    render(<PrivacyPage />)

    expect(screen.getByRole('heading', { level: 1, name: '개인정보 처리방침' })).toBeInTheDocument()
    expect(screen.getByText(/OpenAI, L\.L\.C\./)).toBeInTheDocument()
    expect(screen.getByText(/회원 탈퇴 시 계정과 모든 기록/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'ymkim2353@gmail.com' })).toHaveAttribute(
      'href',
      'mailto:ymkim2353@gmail.com',
    )
  })
})
