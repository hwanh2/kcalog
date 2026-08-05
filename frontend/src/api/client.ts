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

// refresh는 회전 방식이라 같은 쿠키로 두 번 나가면 한쪽이 401이 된다.
// StrictMode 이중 마운트·동시 401 재시도가 겹쳐도 실제 호출은 한 번만 나가도록 진행 중 Promise를 공유한다.
let refreshInflight: Promise<string | null> | null = null

export function refreshAccessToken(): Promise<string | null> {
  refreshInflight ??= (async () => {
    try {
      // credentials: 프론트·백엔드가 다른 오리진으로 배포돼도 refresh 쿠키가 실리도록 (same-origin에선 동작 동일)
      const res = await fetch(`${API_BASE}/api/auth/refresh`, { method: 'POST', credentials: 'include' })
      if (!res.ok) {
        setAccessToken(null)
        return null
      }
      const { accessToken: token } = (await res.json()) as { accessToken: string }
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

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res = await request(path, init)
  if (res.status === 401) {
    const token = await refreshAccessToken()
    if (!token) {
      window.location.assign('/login')
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
  if (init.body != null) {
    headers.set('Content-Type', 'application/json')
  }
  return fetch(`${API_BASE}${path}`, { ...init, headers })
}
