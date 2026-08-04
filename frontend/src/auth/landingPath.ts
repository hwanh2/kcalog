import type { MemberResponse } from '../api/member'

/** 온보딩 여부 → 착지 경로의 단일 출처. 콜백 분기와 가드 리다이렉트가 공유한다 */
export function landingPathFor(member: MemberResponse): string {
  return member.onboardingCompleted ? '/' : '/onboarding'
}
