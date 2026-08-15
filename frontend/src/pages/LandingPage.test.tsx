import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { UA, fireBeforeInstallPrompt, stubInstallEnv } from '../install/__testutils__/installEnv'
import { LandingPage, LandingRoute } from './LandingPage'

function renderLanding(env: { userAgent: string; standalone?: boolean }) {
  stubInstallEnv(env)
  render(
    <MemoryRouter>
      <LandingPage />
    </MemoryRouter>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('LandingPage', () => {
  it('로그인을 요구하기 전에 서비스 설명과 기능을 보여준다', () => {
    renderLanding({ userAgent: UA.mac })

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('10초')
    expect(screen.getByText('찍으면 끝나는 식사 기록')).toBeInTheDocument()
    expect(screen.getByText('체중과 주간 리포트')).toBeInTheDocument()
    expect(screen.getByText('AI 코치')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /카카오/ })).not.toBeInTheDocument()
  })

  it('iOS에서는 공유 → 홈 화면에 추가를 단계별로 안내한다', () => {
    renderLanding({ userAgent: UA.iphone })

    expect(screen.getByText('공유 버튼 누르기')).toBeInTheDocument()
    expect(screen.getByText('‘홈 화면에 추가’ 선택')).toBeInTheDocument()
  })

  it('설치 안내가 특정 브라우저 사용을 요구하지 않는다 — iOS 16.4+는 크롬·엣지에서도 설치된다', () => {
    renderLanding({ userAgent: UA.iphone })

    expect(document.body.textContent).not.toMatch(/Safari|사파리/)
  })

  it('데스크톱에서는 휴대폰으로 넘길 QR을 보여준다', () => {
    renderLanding({ userAgent: UA.mac })

    expect(screen.getByRole('img', { name: /QR/ })).toBeInTheDocument()
  })

  it('데스크톱에서는 설치 프롬프트가 와도 QR 안내를 유지한다 — 사진으로 기록하는 앱이라 설치가 무의미하다', () => {
    renderLanding({ userAgent: UA.mac })
    fireBeforeInstallPrompt()

    expect(screen.getByRole('img', { name: /QR/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /설치/ })).not.toBeInTheDocument()
  })

  it('설치 프롬프트를 받은 모바일에서는 버튼으로 바로 설치한다', async () => {
    const user = userEvent.setup()
    renderLanding({ userAgent: UA.android })
    const { prompt } = fireBeforeInstallPrompt()

    await user.click(screen.getByRole('button', { name: '앱 설치하기' }))
    expect(prompt).toHaveBeenCalled()
  })

  it('실제 앱 화면을 보여준다 — 캡처가 아니라 앱이 쓰는 컴포넌트를 그린다', () => {
    renderLanding({ userAgent: UA.mac })

    // 히어로에 홈, 둘러보기 섹션에 탭별로 하나씩
    expect(screen.getAllByRole('img', { name: /홈 화면 미리보기/ })).toHaveLength(2)
    for (const name of [/음식기록 화면/, /체중 화면/, /AI PT 화면/]) {
      expect(screen.getByRole('img', { name })).toBeInTheDocument()
    }
  })

  it('카카오톡에서 열면 설치 방법 대신 브라우저로 열라고 안내한다 — 웹뷰에서는 설치가 막힌다', () => {
    renderLanding({ userAgent: UA.kakao })

    expect(screen.getByText('먼저 브라우저에서 열어주세요')).toBeInTheDocument()
    expect(screen.getByText('‘다른 브라우저로 열기’ 선택')).toBeInTheDocument()
    expect(screen.queryByText('공유 버튼 누르기')).not.toBeInTheDocument()
  })

  it('의심을 푸는 FAQ를 담는다', () => {
    renderLanding({ userAgent: UA.mac })

    expect(screen.getByText('무료인가요?')).toBeInTheDocument()
    expect(screen.getByText('앱스토어에 없나요?')).toBeInTheDocument()
    expect(screen.getByText('찍은 사진은 어디에 저장되나요?')).toBeInTheDocument()
  })

  it('이미 설치된 앱으로 열면 설치 안내 대신 앱 열기만 보여준다', () => {
    renderLanding({ userAgent: UA.iphone, standalone: true })

    expect(screen.queryByText('홈 화면에 추가하기')).not.toBeInTheDocument()
    // 헤더와 히어로 두 곳에 있다 — 설치 안내 대신 앱으로 들어가는 길만 남는다
    for (const link of screen.getAllByRole('link', { name: '앱 열기' })) {
      expect(link).toHaveAttribute('href', '/app')
    }
  })
})

describe('LandingRoute — 설치된 아이콘으로 들어온 경우', () => {
  function renderRoute(env: { userAgent: string; standalone?: boolean }) {
    stubInstallEnv(env)
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<LandingRoute />} />
          <Route path="/app" element={<div>앱 화면</div>} />
        </Routes>
      </MemoryRouter>,
    )
  }

  /*
    manifest의 start_url만으로는 못 막는다 — 그 값은 설치 시점에 박혀서, 이미 설치된 아이콘에는
    옛 값(`/`)이 남아 있다. 걸러내지 않으면 아이콘을 눌렀을 때 앱 대신 소개 페이지가 뜬다.
  */
  it('홈 화면 아이콘(standalone)으로 들어오면 소개를 건너뛰고 앱으로 간다', () => {
    renderRoute({ userAgent: UA.iphone, standalone: true })

    expect(screen.getByText('앱 화면')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
  })

  it('브라우저로 들어오면 소개 화면을 그대로 보여준다', () => {
    renderRoute({ userAgent: UA.iphone })

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('10초')
    expect(screen.queryByText('앱 화면')).not.toBeInTheDocument()
  })
})
