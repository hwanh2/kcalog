import { act } from '@testing-library/react'
import { vi } from 'vitest'

/** 설치 상태 판정을 재현하는 데 쓰는 UA 모음 — 훅 테스트와 랜딩 테스트가 함께 쓴다 */
export const UA = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15',
  // iPadOS 13+는 자신을 Macintosh로 소개한다 — maxTouchPoints로만 구분된다
  ipad: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
  android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/124.0',
  mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124.0',
  // 카카오톡 인앱 브라우저 — 링크를 뿌릴 가장 유력한 경로다
  kakao:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 KAKAOTALK 10.5.0',
  instagram: 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Instagram 320.0.0.0',
} as const

/** 기기·실행 형태를 흉내낸다. `vi.unstubAllGlobals()`로 되돌린다 */
export function stubInstallEnv({
  userAgent,
  maxTouchPoints = 0,
  standalone = false,
}: {
  userAgent: string
  maxTouchPoints?: number
  standalone?: boolean
}) {
  vi.stubGlobal('navigator', { userAgent, maxTouchPoints })
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query.includes('standalone') && standalone,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  )
}

/** 설치 프롬프트를 내주는 브라우저를 흉내낸다. 반환값으로 prompt 호출 여부를 검증할 수 있다 */
export function makeInstallPromptEvent(outcome: 'accepted' | 'dismissed' = 'accepted') {
  const prompt = vi.fn().mockResolvedValue(undefined)
  const event = Object.assign(new Event('beforeinstallprompt'), {
    prompt,
    userChoice: Promise.resolve({ outcome }),
  })
  return { event, prompt }
}

export function fireBeforeInstallPrompt(outcome: 'accepted' | 'dismissed' = 'accepted') {
  const { event, prompt } = makeInstallPromptEvent(outcome)
  act(() => {
    window.dispatchEvent(event)
  })
  return { event, prompt }
}
