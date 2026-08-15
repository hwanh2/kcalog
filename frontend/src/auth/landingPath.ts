import type { MemberResponse } from '../api/member'

/** 앱 루트. manifest의 start_url과 같은 값이어야 한다 — 홈 화면 아이콘이 곧장 여기로 들어온다 */
export const APP_ROOT = '/app'
export const ONBOARDING_PATH = '/app/onboarding'

/** 온보딩 여부 → 착지 경로의 단일 출처. 콜백 분기와 가드 리다이렉트가 공유한다 */
export function landingPathFor(member: MemberResponse): string {
  return member.onboardingCompleted ? APP_ROOT : ONBOARDING_PATH
}
