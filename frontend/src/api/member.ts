import { api } from './client'

export type Gender = 'MALE' | 'FEMALE'
export type ActivityLevel = 'LOW' | 'MID' | 'HIGH' | 'VERY_HIGH'
/** 목표 방향 — 목표 체중 없이도 목표 칼로리를 정하는 기준 */
export type Goal = 'CUT' | 'MAINTAIN' | 'BULK'

export interface MemberResponse {
  id: number
  nickname: string
  email: string | null
  gender: Gender | null
  birthYear: number | null
  heightCm: number | null
  activityLevel: ActivityLevel | null
  goal: Goal | null
  targetWeightKg: number | null
  dailyKcalTarget: number | null
  latestWeightKg: number | null
  /** 근육량 목표 여부 — 탄단지 비율을 가른다 */
  muscleGoal: boolean
  onboardingCompleted: boolean
}

export interface OnboardingRequest {
  gender: Gender
  birthYear: number
  heightCm: number
  weightKg: number
  activityLevel: ActivityLevel
  goal: Goal
  /** 선택 — 감량·증량을 고른 경우에만 입력 */
  targetWeightKg?: number
  dailyKcalTarget: number
  muscleGoal: boolean
}

/** 제안 칼로리 입력 — 온보딩 요청에서 확정 목표·목표 체중을 뺀 것(계산은 방향으로 한다) */
export type KcalSuggestionParams = Omit<OnboardingRequest, 'dailyKcalTarget' | 'targetWeightKg'>

/** 제안 칼로리 — 계산 근거(유지칼로리)와 목표 기준 탄단지를 함께 준다 */
export interface KcalSuggestion {
  maintenanceKcal: number
  dailyKcalTarget: number
  carbTargetG: number
  proteinTargetG: number
  fatTargetG: number
}

/** 부분 수정 — 담긴 필드만 변경된다. 성별·출생연도도 고칠 수 있다(유지칼로리 공식에 들어가는 값) */
export interface UpdateMemberRequest {
  gender?: Gender
  birthYear?: number
  heightCm?: number
  targetWeightKg?: number
  activityLevel?: ActivityLevel
  goal?: Goal
  dailyKcalTarget?: number
}

export function getMe(): Promise<MemberResponse> {
  return api<MemberResponse>('/api/members/me')
}

export function getKcalSuggestion(params: KcalSuggestionParams): Promise<KcalSuggestion> {
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
