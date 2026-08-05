import { screen } from '@testing-library/react'
import { Route } from 'react-router'
import { describe, expect, it } from 'vitest'
import { makeMember, renderWithAuth } from '../test/utils'
import { HomePage } from './HomePage'

describe('HomePage', () => {
  it('닉네임과 일일 칼로리 목표를 표시한다', () => {
    renderWithAuth(<Route path="/" element={<HomePage />} />, {
      state: {
        status: 'authed',
        member: makeMember({ onboardingCompleted: true, dailyKcalTarget: 1930 }),
      },
      path: '/',
    })

    expect(screen.getByText(/테스터님의 일일 칼로리 목표/)).toBeInTheDocument()
    expect(screen.getByText('1930 kcal')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '프로필' })).toHaveAttribute('href', '/profile')
  })
})
