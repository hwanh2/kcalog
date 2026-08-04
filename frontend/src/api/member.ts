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

export function getMe(): Promise<MemberResponse> {
  return api<MemberResponse>('/api/members/me')
}
