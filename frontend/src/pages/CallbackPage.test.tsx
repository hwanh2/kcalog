import { screen } from '@testing-library/react'
import { Route, useLocation } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { AuthState } from '../auth/context'
import { makeMember, renderWithAuth } from '../test/utils'
import { CallbackPage } from './CallbackPage'

/** 로그인 스텁 — 리다이렉트로 전달된 쿼리까지 함께 노출해 검증한다 */
function LoginStub() {
  const { search } = useLocation()
  return <div>로그인 화면{search}</div>
}

function renderCallback(state: AuthState) {
  renderWithAuth(
    <>
      <Route path="/auth/callback" element={<CallbackPage />} />
      <Route path="/login" element={<LoginStub />} />
      <Route path="/" element={<div>홈 화면</div>} />
      <Route path="/onboarding" element={<div>온보딩 화면</div>} />
    </>,
    { state, path: '/auth/callback' },
  )
}

describe('CallbackPage', () => {
  it('세션 복구가 끝나기 전에는 로딩을 표시한다', () => {
    renderCallback({ status: 'loading', member: null })
    expect(screen.getByText('로그인 중…')).toBeInTheDocument()
  })

  it('세션 생성에 실패하면 오류 코드와 함께 로그인 화면으로 보낸다', () => {
    renderCallback({ status: 'guest', member: null })
    expect(screen.getByText('로그인 화면?error=session')).toBeInTheDocument()
  })

  it('온보딩 미완료 회원은 온보딩 화면으로 보낸다', () => {
    renderCallback({ status: 'authed', member: makeMember({ onboardingCompleted: false }) })
    expect(screen.getByText('온보딩 화면')).toBeInTheDocument()
  })

  it('온보딩 완료 회원은 홈으로 보낸다', () => {
    renderCallback({ status: 'authed', member: makeMember({ onboardingCompleted: true }) })
    expect(screen.getByText('홈 화면')).toBeInTheDocument()
  })
})
