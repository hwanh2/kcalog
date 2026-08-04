import { screen } from '@testing-library/react'
import { Route } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { AuthState } from '../auth/context'
import { makeMember, renderWithAuth } from '../test/utils'
import { LoginPage } from './LoginPage'

function renderLogin(path: string, state: AuthState) {
  renderWithAuth(
    <>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<div>홈 화면</div>} />
    </>,
    { state, path },
  )
}

describe('LoginPage', () => {
  it('카카오 로그인 링크를 보여준다', () => {
    renderLogin('/login', { status: 'guest', member: null })
    expect(screen.getByRole('link', { name: '카카오로 시작하기' }))
      .toHaveAttribute('href', '/oauth2/authorization/kakao')
  })

  it('OAuth 실패로 돌아오면 오류 메시지를 표시한다', () => {
    renderLogin('/login?error=oauth', { status: 'guest', member: null })
    expect(screen.getByRole('alert')).toHaveTextContent('카카오 로그인에 실패했어요')
  })

  it('세션 생성 실패로 돌아오면 해당 오류 메시지를 표시한다', () => {
    renderLogin('/login?error=session', { status: 'guest', member: null })
    expect(screen.getByRole('alert')).toHaveTextContent('로그인 세션을 만들지 못했어요')
  })

  it('이미 로그인된 사용자는 홈으로 보낸다', () => {
    renderLogin('/login', {
      status: 'authed',
      member: makeMember({ onboardingCompleted: true, dailyKcalTarget: 1930 }),
    })
    expect(screen.getByText('홈 화면')).toBeInTheDocument()
  })
})
