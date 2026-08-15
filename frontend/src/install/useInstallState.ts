import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * 설치 안내가 취할 수 있는 상태. **우선순위 순서대로 판정한다.**
 *
 * - `installed`   홈 화면 앱으로 실행 중 → 설치 이야기를 꺼내지 않는다
 * - `in-app`      카카오톡 등 인앱 브라우저 → 여기선 설치가 막힌다. 브라우저로 열도록 안내
 * - `desktop`     모바일이 아님 → 설치가 무의미하므로 QR로 폰에 넘긴다
 * - `installable` 브라우저가 설치 프롬프트를 내줬다 → 버튼 한 번으로 설치
 * - `ios`         iOS인데 프롬프트가 없다(항상 그렇다) → 공유 → 홈 화면에 추가 안내
 * - `android`     안드로이드인데 프롬프트가 없다(이미 소비했거나 미지원 브라우저) → 메뉴 안내
 *
 * 판정을 이 한 곳에 모은 이유: 설치 여부 검사가 화면마다 흩어지면 어느 한 곳에서 빠진다.
 * 실제로 같은 문제를 푼 다른 PWA에서 모달 쪽에만 검사가 빠져, 이미 설치한 사용자에게도
 * "홈 화면에 추가하세요"가 뜨고 있었다.
 */
export type InstallState = 'installed' | 'in-app' | 'desktop' | 'installable' | 'ios' | 'android'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/** 홈 화면에 추가된 앱으로 실행 중인가. iOS는 display-mode를 늦게 지원해 navigator.standalone도 함께 본다 */
export function isStandalone(): boolean {
  const byDisplayMode = window.matchMedia?.('(display-mode: standalone)').matches ?? false
  const byIosLegacy = (navigator as Navigator & { standalone?: boolean }).standalone === true
  return byDisplayMode || byIosLegacy
}

/** iPadOS 13+는 UA가 Macintosh로 나온다 — 터치 포인트로 갈라야 아이패드가 데스크톱 안내(QR)를 받지 않는다 */
export function isIos(): boolean {
  const ua = navigator.userAgent
  return /iPhone|iPod|iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
}

export function isAndroid(): boolean {
  return /Android/.test(navigator.userAgent)
}

/**
 * 앱 안에 박힌 웹뷰인가. **여기서는 홈 화면 추가가 막히거나 망가진다** —
 * 링크를 뿌릴 가장 유력한 경로가 카카오톡이라, 감지하지 못하면 안내대로 따라 해도 설치에 실패한다.
 * 웹뷰는 자기 이름을 UA에 남긴다(KAKAOTALK, Instagram, FBAV, NAVER, Line 등).
 */
export function isInAppBrowser(): boolean {
  return /KAKAOTALK|Instagram|FBAN|FBAV|NAVER|Line\/|DaumApps|Snapchat|Twitter/i.test(
    navigator.userAgent,
  )
}

/** 설치 프롬프트를 아직 못 받은 시점의 판정. 프롬프트가 오면 훅이 installable로 올린다 */
export function detectInstallState(): InstallState {
  if (isStandalone()) return 'installed'
  // 인앱 브라우저 판정이 플랫폼보다 먼저다 — 여기선 어떤 안내를 해도 설치까지 갈 수 없다
  if (isInAppBrowser()) return 'in-app'
  if (isIos()) return 'ios'
  if (isAndroid()) return 'android'
  return 'desktop'
}

export interface InstallController {
  state: InstallState
  /** 설치 프롬프트를 띄운다. 프롬프트가 없으면 아무 일도 하지 않는다(상태가 installable일 때만 호출된다) */
  promptInstall: () => Promise<void>
}

export function useInstallState(): InstallController {
  const [state, setState] = useState<InstallState>(detectInstallState)
  const deferred = useRef<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      // 기본 미니 인포바를 막고 이벤트를 쥐고 있다가 사용자가 누를 때 띄운다
      event.preventDefault()
      deferred.current = event as BeforeInstallPromptEvent
      // 데스크톱 크롬도 이 이벤트를 쏘지만 사진으로 기록하는 앱이라 설치가 무의미하다.
      // installed·in-app·desktop 판정이 프롬프트보다 우선한다.
      setState((prev) =>
        prev === 'installed' || prev === 'in-app' || prev === 'desktop' ? prev : 'installable',
      )
    }
    const onInstalled = () => {
      deferred.current = null
      setState('installed')
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    const event = deferred.current
    if (!event) return
    await event.prompt()
    const { outcome } = await event.userChoice
    // 프롬프트는 한 번 쓰면 재사용할 수 없다 — 거절당하면 수동 안내로 내려가야 버튼이 죽지 않는다
    deferred.current = null
    setState(outcome === 'accepted' ? 'installed' : detectInstallState())
  }, [])

  return { state, promptInstall }
}
