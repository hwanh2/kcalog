import { API_BASE, setAccessToken } from './client'

export async function logout(): Promise<void> {
  await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST' })
  setAccessToken(null)
}

export function kakaoLoginUrl(): string {
  return `${API_BASE}/oauth2/authorization/kakao`
}
