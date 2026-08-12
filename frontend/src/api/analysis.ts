import { API_BASE, ApiError, api, getAccessToken, refreshAccessToken } from './client'
import type { MealAnalysis } from './meal'

export type AnalysisStatus = 'ANALYZING' | 'COMPLETED' | 'NO_FOOD' | 'FAILED'

/** 비동기 분석 작업 — status로 진행 상태, COMPLETED/NO_FOOD면 result에 분석 결과.
 *  imageUrl은 사진 없이 설명만으로 만든 작업이면 null */
export interface Analysis {
  id: number
  status: AnalysisStatus
  imageUrl: string | null // 백엔드 프록시 경로(/api/photos/...) — 인증 필요, AuthImage로 로드
  result: MealAnalysis | null
  errorCode: string | null
}

/** 작업당 재분석 상한 — 백엔드 AnalysisJob.MAX_REANALYSIS의 거울 */
export const MAX_REANALYSIS = 2

/**
 * 분석 작업 생성 — 사진·설명 중 최소 하나로 만든다(사진만 / 사진+설명 / 설명만).
 * 멀티파트 업로드 후 즉시 작업(id·ANALYZING) 반환. 멀티파트라 api() 대신 직접 401 재시도.
 */
export async function createAnalysis(input: { image?: Blob; note?: string }): Promise<Analysis> {
  const send = () => {
    const form = new FormData()
    if (input.image) form.append('image', input.image, 'meal.jpg')
    if (input.note) form.append('note', input.note)
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

/** 설명을 덧붙여 다시 분석 — 같은 작업을 갱신하고 사진은 재사용한다(작업당 2회) */
export function reanalyze(id: number, note: string): Promise<Analysis> {
  return api(`/api/analyses/${id}/reanalyze`, { method: 'POST', body: JSON.stringify({ note }) })
}

export function getAnalysis(id: number): Promise<Analysis> {
  return api(`/api/analyses/${id}`)
}
