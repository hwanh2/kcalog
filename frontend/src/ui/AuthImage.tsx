import { useEffect, useState } from 'react'
import { API_BASE, getAccessToken, refreshAccessToken } from '../api/client'

/**
 * 인증이 필요한 사진(/api/photos/...)을 Bearer 헤더로 가져와 표시한다.
 * <img src>는 헤더를 못 실으므로 fetch→blob→objectURL로 우회한다. 로드 전·실패 시 자리만 차지.
 */
export function AuthImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let created: string | null = null

    async function load() {
      const fetchOnce = () => {
        const headers = new Headers()
        const token = getAccessToken()
        if (token) headers.set('Authorization', `Bearer ${token}`)
        return fetch(`${API_BASE}${src}`, { headers })
      }
      try {
        let res = await fetchOnce()
        if (res.status === 401 && (await refreshAccessToken())) {
          res = await fetchOnce()
        }
        if (!res.ok || cancelled) return
        const blob = await res.blob()
        if (cancelled) return
        created = URL.createObjectURL(blob)
        setObjectUrl(created)
      } catch {
        // 실패 시 자리표시자 유지
      }
    }
    void load()
    return () => {
      cancelled = true
      if (created) URL.revokeObjectURL(created)
    }
  }, [src])

  if (!objectUrl) return <div className={className} aria-hidden="true" />
  return <img src={objectUrl} alt={alt} className={className} />
}
