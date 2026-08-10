import { API_BASE, ApiError, api, getAccessToken, refreshAccessToken } from './client'
import type { MealAnalysis } from './meal'

export type AnalysisStatus = 'ANALYZING' | 'COMPLETED' | 'NO_FOOD' | 'FAILED'

/** 비동기 분석 작업 — status로 진행 상태, COMPLETED/NO_FOOD면 result에 분석 결과 */
export interface Analysis {
  id: number
  status: AnalysisStatus
  imageUrl: string // 백엔드 프록시 경로(/api/photos/...) — 인증 필요, AuthImage로 로드
  result: MealAnalysis | null
  errorCode: string | null
}

/**
 * 분석 작업 생성 — 멀티파트 업로드 후 즉시 작업(id·ANALYZING) 반환. 멀티파트라 api() 대신 직접 401 재시도.
 */
export async function createAnalysis(image: Blob): Promise<Analysis> {
  const send = () => {
    const form = new FormData()
    form.append('image', image, 'meal.jpg')
    const headers = new Headers()
    const token = getAccessToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
    return fetch(`${API_BASE}/api/analyses`, { method: 'POST', body: form, headers })
  }

  let res = await send()
  if (res.status === 401) {
    const token = await refreshAccessToken()
    if (!token) {
      window.location.assign('/login')
      throw new ApiError(401, null)
    }
    res = await send()
  }
  if (!res.ok) {
    throw new ApiError(res.status, await res.json().catch(() => null))
  }
  return (await res.json()) as Analysis
}

export function getAnalysis(id: number): Promise<Analysis> {
  return api(`/api/analyses/${id}`)
}
