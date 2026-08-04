import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, api, getAccessToken, refreshAccessToken, setAccessToken } from './client'

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  setAccessToken(null)
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubGlobal('location', { assign: vi.fn() })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function authHeaderOfCall(callIndex: number): string | null {
  const init = fetchMock.mock.calls[callIndex][1]
  return new Headers(init?.headers).get('Authorization')
}

describe('api 클라이언트', () => {
  it('보관 중인 access 토큰을 Bearer 헤더로 첨부하고 JSON을 반환한다', async () => {
    setAccessToken('token-a')
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { id: 1 }))

    const result = await api<{ id: number }>('/api/members/me')

    expect(result).toEqual({ id: 1 })
    expect(authHeaderOfCall(0)).toBe('Bearer token-a')
  })

  it('401이면 refresh 후 새 토큰으로 원 요청을 1회 재시도한다', async () => {
    setAccessToken('expired-token')
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 401 })) // 원 요청
      .mockResolvedValueOnce(jsonResponse(200, { accessToken: 'new-token' })) // refresh
      .mockResolvedValueOnce(jsonResponse(200, { id: 1 })) // 재시도

    const result = await api<{ id: number }>('/api/members/me')

    expect(result).toEqual({ id: 1 })
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(fetchMock.mock.calls[1][0]).toBe('/api/auth/refresh')
    expect(authHeaderOfCall(2)).toBe('Bearer new-token')
    expect(getAccessToken()).toBe('new-token')
  })

  it('refresh까지 실패하면 토큰을 비우고 로그인 화면으로 이동시킨다', async () => {
    setAccessToken('expired-token')
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 401 })) // 원 요청
      .mockResolvedValueOnce(new Response(null, { status: 401 })) // refresh 실패

    await expect(api('/api/members/me')).rejects.toMatchObject({ status: 401 })

    expect(getAccessToken()).toBeNull()
    expect(location.assign).toHaveBeenCalledWith('/login')
  })

  it('재시도는 1회만 한다 — 재시도도 401이면 그대로 오류를 던진다', async () => {
    setAccessToken('expired-token')
    fetchMock
      .mockResolvedValueOnce(new Response(null, { status: 401 })) // 원 요청
      .mockResolvedValueOnce(jsonResponse(200, { accessToken: 'new-token' })) // refresh
      .mockResolvedValueOnce(new Response(null, { status: 401 })) // 재시도도 401

    await expect(api('/api/members/me')).rejects.toBeInstanceOf(ApiError)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('4xx 오류는 응답 본문을 담은 ApiError로 던진다', async () => {
    setAccessToken('token-a')
    fetchMock.mockResolvedValueOnce(jsonResponse(400, { errors: { heightCm: '범위 밖' } }))

    await expect(api('/api/members/me')).rejects.toMatchObject({
      status: 400,
      body: { errors: { heightCm: '범위 밖' } },
    })
  })

  it('204 응답은 본문 파싱 없이 완료된다', async () => {
    setAccessToken('token-a')
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))

    await expect(api<void>('/api/auth/logout', { method: 'POST' })).resolves.toBeUndefined()
  })
})

describe('refreshAccessToken 단일 비행', () => {
  it('동시에 여러 번 호출해도 실제 refresh 요청은 1회만 나간다', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { accessToken: 'shared-token' }))

    const [first, second] = await Promise.all([refreshAccessToken(), refreshAccessToken()])

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(first).toBe('shared-token')
    expect(second).toBe('shared-token')
  })

  it('완료된 뒤의 재호출은 새 요청을 보낸다 (회전 반영)', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { accessToken: 'token-1' }))
      .mockResolvedValueOnce(jsonResponse(200, { accessToken: 'token-2' }))

    await refreshAccessToken()
    const second = await refreshAccessToken()

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(second).toBe('token-2')
  })

  it('refresh 실패 시 null을 반환하고 토큰을 비운다', async () => {
    setAccessToken('old-token')
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 401 }))

    await expect(refreshAccessToken()).resolves.toBeNull()
    expect(getAccessToken()).toBeNull()
  })
})
