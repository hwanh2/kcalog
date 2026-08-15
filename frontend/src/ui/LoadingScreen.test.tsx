import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LoadingScreen } from './LoadingScreen'

describe('LoadingScreen', () => {
  it('무엇을 기다리는지 눈에 보이는 글로 알린다', () => {
    render(<LoadingScreen message="불러오는 중…" />)

    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('불러오는 중…')
    // sr-only가 아니어야 한다 — 모션 축소 설정이면 링이 멈춰 글이 유일한 단서가 된다(design D4)
    expect(status).not.toHaveClass('sr-only')
  })

  it('문구를 받아 쓴다 — 같은 화면을 인증 확인·로그인 처리가 함께 쓴다', () => {
    render(<LoadingScreen message="로그인 중…" />)

    expect(screen.getByRole('status')).toHaveTextContent('로그인 중…')
  })
})
