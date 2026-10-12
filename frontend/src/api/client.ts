import { IS_TOSS, loadToss } from '../platform'

export const API_BASE: string = import.meta.env.VITE_API_BASE_URL ?? ''

let accessToken: string | null = null

export function setAccessToken(token: string | null) {
  accessToken = token
}

export function getAccessToken() {
  return accessToken
}

export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, body: unknown) {
    super(`API 오류 (${status})`)
    this.status = status
    this.body = body
  }
}

/** 검증 400 응답(ProblemDetail)의 항목별 오류 맵 추출 — 아니면 null */
export function fieldErrorsFrom(error: unknown): Record<string, string> | null {
  if (error instanceof ApiError && error.body && typeof error.body === 'object') {
    const errors = (error.body as { errors?: unknown }).errors
    if (errors && typeof errors === 'object') return errors as Record<string, string>
  }
  return null
}

// 갱신은 한 번만 나가야 한다. 웹의 refresh는 회전 방식이라 같은 쿠키로 두 번 나가면 한쪽이 401이 되고,
// 토스의 인가 코드는 1회용이다. StrictMode 이중 마운트, 동시 401 재시도가 겹쳐도 진행 중 Promise를 공유한다.
let refreshInflight: Promise<string | null> | null = null

export function refreshAccessToken(): Promise<string | null> {
  refreshInflight ??= (async () => {
    try {
      const token = IS_TOSS ? await loginWithToss() : await refreshWithCookie()
      setAccessToken(token)
      return token
    } catch {
      return null
    } finally {
      refreshInflight = null
    }
  })()
  return refreshInflight
}

async function refreshWithCookie(): Promise<string | null> {
  // credentials: 프론트·백엔드가 다른 오리진으로 배포돼도 refresh 쿠키가 실리도록 (same-origin에선 동작 동일)
  const res = await fetch(`${API_BASE}/api/auth/refresh`, { method: 'POST', credentials: 'include' })
  if (!res.ok) return null
  return ((await res.json()) as { accessToken: string }).accessToken
}

// 토스 빌드는 refresh 토큰이 없다. iOS WebView가 서드파티 쿠키를 막아서, 만료되면 새 인가 코드로 다시 로그인한다 (D4)
let tossUpdateRequired = false

/** 토스 앱이 너무 오래돼 로그인할 수 없는지. 다시 시도 화면이 업데이트 안내로 바뀐다 */
export function isTossUpdateRequired() {
  return tossUpdateRequired
}

async function loginWithToss(): Promise<string | null> {
  const { createAuthCode } = await loadToss()
  const result = await createAuthCode()
  tossUpdateRequired = result.status === 'update-required'
  if (result.status !== 'ok') return null
  const res = await fetch(`${API_BASE}/api/auth/toss`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: result.code }),
  })
  if (!res.ok) return null
  return ((await res.json()) as { accessToken: string }).accessToken
}

let sessionLostListener: (() => void) | null = null

/** 토스 빌드에서 갱신이 끝내 실패했을 때 알림을 받는다. AuthProvider가 다시 시도 화면을 띄우는 데 쓴다 */
export function onSessionLost(listener: (() => void) | null) {
  sessionLostListener = listener
}

/** 갱신까지 실패한 401. 웹은 로그인 화면으로 보내고, 로그인 화면이 없는 토스 빌드는 리스너에 맡긴다 */
export function handleSessionLost() {
  if (IS_TOSS) {
    sessionLostListener?.()
    return
  }
  window.location.assign('/login')
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res = await request(path, init)
  if (res.status === 401) {
    const token = await refreshAccessToken()
    if (!token) {
      handleSessionLost()
      throw new ApiError(401, null)
    }
    res = await request(path, init)
  }
  if (!res.ok) {
    throw new ApiError(res.status, await res.json().catch(() => null))
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T)
}

function request(path: string, init: RequestInit) {
  const headers = new Headers(init.headers)
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }
  // JSON 본문에만 Content-Type 지정 — FormData는 브라우저가 multipart boundary를 자동 설정하도록 둔다
  if (typeof init.body === 'string') {
    headers.set('Content-Type', 'application/json')
  }
  return fetch(`${API_BASE}${path}`, { ...init, headers })
}
