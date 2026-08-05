import { api } from './client'

export type Gender = 'MALE' | 'FEMALE'
export type ActivityLevel = 'LOW' | 'MID' | 'HIGH'

export interface MemberResponse {
  id: number
  nickname: string
  email: string | null
  gender: Gender | null
  birthYear: number | null
  heightCm: number | null
  activityLevel: ActivityLevel | null
  targetWeightKg: number | null
  dailyKcalTarget: number | null
  latestWeightKg: number | null
  onboardingCompleted: boolean
}

export interface OnboardingRequest {
  gender: Gender
  birthYear: number
  heightCm: number
  weightKg: number
  targetWeightKg: number
  activityLevel: ActivityLevel
  dailyKcalTarget: number
}

/** 제안 칼로리 입력 — 온보딩 요청에서 확정 목표만 뺀 것 */
export type KcalSuggestionParams = Omit<OnboardingRequest, 'dailyKcalTarget'>

/** 부분 수정 — 담긴 필드만 변경된다 */
export interface UpdateMemberRequest {
  heightCm?: number
  targetWeightKg?: number
  activityLevel?: ActivityLevel
  dailyKcalTarget?: number
}

export function getMe(): Promise<MemberResponse> {
  return api<MemberResponse>('/api/members/me')
}

export function getKcalSuggestion(params: KcalSuggestionParams): Promise<{ dailyKcalTarget: number }> {
  const query = new URLSearchParams(
    Object.entries(params).map(([key, value]) => [key, String(value)]),
  )
  return api(`/api/members/me/kcal-suggestion?${query}`)
}

export function completeOnboarding(request: OnboardingRequest): Promise<MemberResponse> {
  return api('/api/members/me/onboarding', { method: 'POST', body: JSON.stringify(request) })
}

export function updateMember(request: UpdateMemberRequest): Promise<MemberResponse> {
  return api('/api/members/me', { method: 'PATCH', body: JSON.stringify(request) })
}
