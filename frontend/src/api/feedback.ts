import { api } from './client'

/** 서버가 돌려주는 것은 받았다는 확인뿐이다 — 보낸 글은 화면이 이미 갖고 있다 */
export interface FeedbackReceipt {
  id: number
  createdAt: string
}

/** 내용 상한 — 서버 검증(2000자)과 같은 값이어야 화면에서 먼저 막을 수 있다 */
export const FEEDBACK_MAX = 2000

/**
 * 의견 보내기. 기기 정보는 보내지 않는다 — 서버가 요청 헤더(User-Agent)에서 읽는다.
 * 본문에 실으면 화면마다 빠뜨리고, 값도 마음대로 적을 수 있다.
 */
export function sendFeedback(request: { content: string; appVersion: string }): Promise<FeedbackReceipt> {
  return api('/api/feedback', { method: 'POST', body: JSON.stringify(request) })
}
