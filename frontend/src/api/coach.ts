import { api, API_BASE, ApiError, getAccessToken, refreshAccessToken } from './client'

/** 브리핑 요약 지표 — 감량 변화(kg)·목표 달성률(%)·연속일. 산출 불가 시 각 null */
export interface CoachingStats {
  lossKg: number | null
  adherencePct: number | null
  streakDays: number | null
}

export type RecommendationCategory = 'meal' | 'activity' | 'hydration' | 'habit'

/** 오늘의 추천 한 장 — category로 아이콘 매핑 */
export interface CoachingRecommendation {
  category: RecommendationCategory
  title: string
  detail: string
}

/** 오늘의 브리핑 — hasData=false면 데이터 부족 안내. source=LLM|FALLBACK|NONE */
export interface CoachingBriefing {
  hasData: boolean
  headline: string
  message: string
  recommendations: CoachingRecommendation[]
  stats: CoachingStats
  source: 'LLM' | 'FALLBACK' | 'NONE'
}

export interface CoachingChatMessage {
  id: number
  role: 'USER' | 'ASSISTANT'
  content: string
  createdAt: string
}

export function getBriefing(): Promise<CoachingBriefing> {
  return api('/api/coach/briefing')
}

export function getMessages(): Promise<CoachingChatMessage[]> {
  return api('/api/coach/messages')
}

export function clearMessages(): Promise<void> {
  return api('/api/coach/messages', { method: 'DELETE' })
}

interface SseEvent {
  event: string
  data: string
}

/**
 * SSE 버퍼에서 완결된 이벤트(빈 줄로 구분)를 뽑아낸다. 남은 미완결 조각은 rest로 돌려준다.
 * 순수 함수 — 스트림 리더와 분리해 테스트 가능.
 */
export function parseSseBuffer(buffer: string): { events: SseEvent[]; rest: string } {
  const events: SseEvent[] = []
  let rest = buffer
  let idx: number
  while ((idx = rest.indexOf('\n\n')) !== -1) {
    const block = rest.slice(0, idx)
    rest = rest.slice(idx + 2)
    let event = 'message'
    let data = ''
    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim()
      else if (line.startsWith('data:')) data += line.slice(5).replace(/^ /, '')
    }
    if (data) events.push({ event, data })
  }
  return { events, rest }
}

/**
 * 코치에게 질문을 보내고 응답을 SSE로 받는다. token 이벤트마다 onToken(조각)을 호출하고,
 * done 이벤트의 저장된 메시지를 반환한다. 401이면 refresh 후 1회 재시도, 상한 초과(429)는 ApiError.
 */
export async function streamMessage(
  content: string,
  onToken: (piece: string) => void,
): Promise<CoachingChatMessage> {
  let res = await postChat(content)
  if (res.status === 401) {
    const token = await refreshAccessToken()
    if (!token) {
      window.location.assign('/login')
      throw new ApiError(401, null)
    }
    res = await postChat(content)
  }
  if (!res.ok || !res.body) {
    throw new ApiError(res.status, await res.json().catch(() => null))
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let done: CoachingChatMessage | null = null
  for (;;) {
    const { value, done: finished } = await reader.read()
    if (finished) break
    buffer += decoder.decode(value, { stream: true })
    const parsed = parseSseBuffer(buffer)
    buffer = parsed.rest
    for (const ev of parsed.events) {
      if (ev.event === 'token') {
        const piece = (JSON.parse(ev.data) as { t?: string }).t
        if (piece) onToken(piece)
      } else if (ev.event === 'done') {
        done = JSON.parse(ev.data) as CoachingChatMessage
      }
    }
  }
  if (!done) throw new ApiError(0, null)
  return done
}

function postChat(content: string): Promise<Response> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = getAccessToken()
  if (token) headers.Authorization = `Bearer ${token}`
  return fetch(`${API_BASE}/api/coach/messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ content }),
  })
}
