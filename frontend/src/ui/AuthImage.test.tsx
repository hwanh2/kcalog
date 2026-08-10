import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setAccessToken } from '../api/client'
import { AuthImage } from './AuthImage'

describe('AuthImage', () => {
  beforeEach(() => {
    setAccessToken('token-abc')
    globalThis.URL.createObjectURL = vi.fn(() => 'blob:mock')
    globalThis.URL.revokeObjectURL = vi.fn()
  })
  afterEach(() => {
    vi.restoreAllMocks()
    setAccessToken(null)
  })

  it('사진을 Bearer 헤더로 가져와 img로 렌더한다', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      blob: () => Promise.resolve(new Blob(['x'], { type: 'image/jpeg' })),
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<AuthImage src="/api/photos/1/abc" alt="식사 사진" className="thumb" />)

    const img = await screen.findByAltText('식사 사진')
    expect(img).toHaveAttribute('src', 'blob:mock')
    // Authorization 헤더가 실렸는지
    const headers = fetchMock.mock.calls[0][1].headers as Headers
    expect(headers.get('Authorization')).toBe('Bearer token-abc')
  })

  it('실패 응답이면 img를 만들지 않는다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 404 }))

    render(<AuthImage src="/api/photos/1/missing" alt="식사 사진" className="thumb" />)

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled())
    expect(screen.queryByAltText('식사 사진')).not.toBeInTheDocument()
  })
})
