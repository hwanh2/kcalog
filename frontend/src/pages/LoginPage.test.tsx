import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { MemberResponse } from '../api/member'
import { AuthContext } from '../auth/context'
import type { AuthState } from '../auth/context'
import { LoginPage } from './LoginPage'

function renderLogin(path: string, state: AuthState) {
  render(
    <AuthContext value={{ state, reloadMember: vi.fn(), signOut: vi.fn() }}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<div>홈 화면</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext>,
  )
}

const authedMember: MemberResponse = {
  id: 1,
  nickname: '테스터',
  email: null,
  gender: null,
  birthYear: null,
  heightCm: null,
  activityLevel: null,
  targetWeightKg: null,
  dailyKcalTarget: 1930,
  latestWeightKg: null,
  onboardingCompleted: true,
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
    renderLogin('/login', { status: 'authed', member: authedMember })
    expect(screen.getByText('홈 화면')).toBeInTheDocument()
  })
})
