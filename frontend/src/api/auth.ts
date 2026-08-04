import { API_BASE, setAccessToken } from './client'

export async function logout(): Promise<void> {
  // credentials: 교차출처 배포 시에도 refresh 쿠키가 실리도록 (client.ts refresh와 동일)
  await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' })
  setAccessToken(null)
}

export function kakaoLoginUrl(): string {
  return `${API_BASE}/oauth2/authorization/kakao`
}
