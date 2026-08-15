import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  UA,
  fireBeforeInstallPrompt,
  makeInstallPromptEvent,
  stubInstallEnv as setEnv,
} from './__testutils__/installEnv'
import { rememberInstallPrompt, takeRememberedPrompt, useInstallState } from './useInstallState'

afterEach(() => {
  vi.unstubAllGlobals()
  // 다음 테스트로 새지 않도록 보관된 프롬프트를 비운다
  takeRememberedPrompt()
})

describe('useInstallState', () => {
  it('홈 화면 앱으로 실행 중이면 설치됨으로 본다', () => {
    setEnv({ userAgent: UA.iphone, standalone: true })
    const { result } = renderHook(() => useInstallState())
    expect(result.current.state).toBe('installed')
  })

  it('iOS 구버전 방식(navigator.standalone)도 설치됨으로 본다', () => {
    vi.stubGlobal('navigator', { userAgent: UA.iphone, maxTouchPoints: 5, standalone: true })
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })))
    const { result } = renderHook(() => useInstallState())
    expect(result.current.state).toBe('installed')
  })

  it('아이폰은 iOS 안내 대상이다', () => {
    setEnv({ userAgent: UA.iphone })
    const { result } = renderHook(() => useInstallState())
    expect(result.current.state).toBe('ios')
  })

  it('아이패드는 UA가 Macintosh여도 데스크톱이 아니라 iOS로 본다', () => {
    setEnv({ userAgent: UA.ipad, maxTouchPoints: 5 })
    const { result } = renderHook(() => useInstallState())
    expect(result.current.state).toBe('ios')
  })

  it('터치가 없는 맥은 데스크톱으로 본다', () => {
    setEnv({ userAgent: UA.mac, maxTouchPoints: 0 })
    const { result } = renderHook(() => useInstallState())
    expect(result.current.state).toBe('desktop')
  })

  it('안드로이드는 프롬프트가 오기 전까지 수동 안내 대상이다', () => {
    setEnv({ userAgent: UA.android })
    const { result } = renderHook(() => useInstallState())
    expect(result.current.state).toBe('android')
  })

  it('설치 프롬프트를 받으면 설치 실행 가능 상태가 된다', () => {
    setEnv({ userAgent: UA.android })
    const { result } = renderHook(() => useInstallState())
    fireBeforeInstallPrompt()
    expect(result.current.state).toBe('installable')
  })

  it('이미 설치된 상태에서는 프롬프트가 와도 설치 안내로 내려가지 않는다', () => {
    setEnv({ userAgent: UA.android, standalone: true })
    const { result } = renderHook(() => useInstallState())
    fireBeforeInstallPrompt()
    expect(result.current.state).toBe('installed')
  })

  it('데스크톱에서는 프롬프트가 와도 QR 안내를 유지한다', () => {
    setEnv({ userAgent: UA.mac })
    const { result } = renderHook(() => useInstallState())
    fireBeforeInstallPrompt()
    expect(result.current.state).toBe('desktop')
  })

  it('설치를 수락하면 설치됨으로 바뀐다', async () => {
    setEnv({ userAgent: UA.android })
    const { result } = renderHook(() => useInstallState())
    fireBeforeInstallPrompt('accepted')
    await act(async () => {
      await result.current.promptInstall()
    })
    expect(result.current.state).toBe('installed')
  })

  it('설치를 거절하면 수동 안내로 내려간다 — 프롬프트는 재사용할 수 없어 버튼이 죽는다', async () => {
    setEnv({ userAgent: UA.android })
    const { result } = renderHook(() => useInstallState())
    fireBeforeInstallPrompt('dismissed')
    await act(async () => {
      await result.current.promptInstall()
    })
    expect(result.current.state).toBe('android')
  })

  it('카카오톡 인앱 브라우저는 별도 안내 대상이다 — 여기서는 홈 화면 추가가 막힌다', () => {
    setEnv({ userAgent: UA.kakao })
    const { result } = renderHook(() => useInstallState())
    expect(result.current.state).toBe('in-app')
  })

  it('인스타그램 웹뷰도 마찬가지다', () => {
    setEnv({ userAgent: UA.instagram })
    const { result } = renderHook(() => useInstallState())
    expect(result.current.state).toBe('in-app')
  })

  it('인앱 브라우저 판정이 플랫폼보다 먼저다 — iOS 안내를 따라 해도 설치되지 않는다', () => {
    setEnv({ userAgent: UA.kakao })
    const { result } = renderHook(() => useInstallState())
    expect(result.current.state).not.toBe('ios')
  })

  it('마운트 전에 온 프롬프트도 집어간다 — 놓치면 원-탭 설치 버튼이 안 뜬다', () => {
    setEnv({ userAgent: UA.android })
    rememberInstallPrompt(makeInstallPromptEvent().event)

    const { result } = renderHook(() => useInstallState())
    expect(result.current.state).toBe('installable')
  })

  it('보관된 프롬프트는 한 번만 넘어간다 — 프롬프트는 재사용할 수 없다', () => {
    rememberInstallPrompt(makeInstallPromptEvent().event)

    expect(takeRememberedPrompt()).not.toBeNull()
    expect(takeRememberedPrompt()).toBeNull()
  })

  it('설치 완료 이벤트를 받으면 설치됨으로 바뀐다', () => {
    setEnv({ userAgent: UA.android })
    const { result } = renderHook(() => useInstallState())
    act(() => {
      window.dispatchEvent(new Event('appinstalled'))
    })
    expect(result.current.state).toBe('installed')
  })
})
