import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const createAuthCode = vi.fn<() => Promise<{ status: 'ok'; code: string } | { status: 'update-required' }>>()

// 토스 빌드 상수는 빌드 타임에 정해지므로, 플랫폼 모듈을 갈아 끼워 토스 빌드를 흉내 낸다
vi.mock('../platform', () => ({
  IS_TOSS: true,
  loadToss: () => Promise.resolve({ createAuthCode }),
}))

const { api, getAccessToken, isTossUpdateRequired, onSessionLost, refreshAccessToken, setAccessToken } =
  await import('./client')

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  setAccessToken(null)
  fetchMock.mockReset()
  createAuthCode.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubGlobal('location', { assign: vi.fn() })
})

afterEach(() => {
  onSessionLost(null)
  vi.unstubAllGlobals()
})

describe('api 클라이언트 (토스 빌드)', () => {
  it('갱신은 새 인가 코드로 익명 키 로그인을 하고 쿠키를 싣지 않는다', async () => {
    createAuthCode.mockResolvedValueOnce({ status: 'ok', code: 'code-1' })
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { accessToken: 'toss-token' }))

    const token = await refreshAccessToken()

    expect(token).toBe('toss-token')
    expect(getAccessToken()).toBe('toss-token')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/auth/toss')
    expect(init?.body).toBe(JSON.stringify({ code: 'code-1' }))
    expect(init?.credentials).toBeUndefined()
  })

  it('만료된 토큰으로 401을 받으면 다시 로그인하고 원 요청을 재시도한다', async () => {
    setAccessToken('expired')
    createAuthCode.mockResolvedValueOnce({ status: 'ok', code: 'code-2' })
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 401 })) // 원 요청
      .mockResolvedValueOnce(jsonResponse(200, { accessToken: 'fresh' })) // 재로그인
      .mockResolvedValueOnce(jsonResponse(200, { id: 1 })) // 재시도

    const result = await api<{ id: number }>('/api/members/me')

    expect(result).toEqual({ id: 1 })
    expect(new Headers(fetchMock.mock.calls[2][1]?.headers).get('Authorization')).toBe('Bearer fresh')
  })

  it('동시에 세 요청이 401을 받아도 재로그인은 한 번만 한다', async () => {
    setAccessToken('expired')
    createAuthCode.mockResolvedValue({ status: 'ok', code: 'code-3' })
    fetchMock.mockImplementation(async (input, init) => {
      if (input === '/api/auth/toss') return jsonResponse(200, { accessToken: 'fresh' })
      const auth = new Headers(init?.headers).get('Authorization')
      return auth === 'Bearer fresh' ? jsonResponse(200, { ok: true }) : new Response(null, { status: 401 })
    })

    await Promise.all([api('/api/a'), api('/api/b'), api('/api/c')])

    expect(fetchMock.mock.calls.filter(([url]) => url === '/api/auth/toss')).toHaveLength(1)
    expect(createAuthCode).toHaveBeenCalledTimes(1)
  })

  it('재로그인이 실패하면 로그인 화면으로 보내지 않고 세션 끊김을 알린다', async () => {
    const lost = vi.fn()
    onSessionLost(lost)
    setAccessToken('expired')
    createAuthCode.mockResolvedValueOnce({ status: 'ok', code: 'code-4' })
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 401 })) // 원 요청
      .mockResolvedValueOnce(new Response(null, { status: 503 })) // 재로그인 실패

    await expect(api('/api/members/me')).rejects.toMatchObject({ status: 401 })

    expect(lost).toHaveBeenCalledTimes(1)
    expect(location.assign).not.toHaveBeenCalled()
  })

  it('인가 코드 발급(SDK)이 실패해도 예외 대신 null로 끝난다', async () => {
    createAuthCode.mockRejectedValueOnce(new Error('UNKNOWN_ERROR'))

    await expect(refreshAccessToken()).resolves.toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('토스 앱이 오래돼 인가 코드를 못 받으면 서버를 부르지 않고 업데이트가 필요하다고 표시한다', async () => {
    createAuthCode.mockResolvedValueOnce({ status: 'update-required' })

    await expect(refreshAccessToken()).resolves.toBeNull()

    expect(fetchMock).not.toHaveBeenCalled()
    expect(isTossUpdateRequired()).toBe(true)
  })
})
