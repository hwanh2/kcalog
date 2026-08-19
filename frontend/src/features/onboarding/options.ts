import type { ActivityLevel, Gender, Goal } from '../../api/member'

/** 활동량 4단계 — 백엔드 계수(1.2 / 1.5 / 1.75 / 1.9)와 1:1 대응 */
export const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; description: string }[] = [
  { value: 'LOW', label: '거의 앉아서 생활', description: '주 0~1회 운동' },
  { value: 'MID', label: '보통', description: '주 2~3회 운동' },
  { value: 'HIGH', label: '활동적', description: '주 4~5회 운동' },
  { value: 'VERY_HIGH', label: '매우 활동적', description: '거의 매일 운동 · 육체노동' },
]

/** 목표 방향 — 설명 문구는 백엔드 조정 상수(−500 / 0 / +300)를 그대로 쓴다 */
export const GOAL_OPTIONS: { value: Goal; label: string; description: string; icon: string }[] = [
  { value: 'CUT', label: '체중 감량', description: '유지 칼로리보다 500kcal 적게', icon: '↓' },
  { value: 'MAINTAIN', label: '체중 유지', description: '유지 칼로리 그대로', icon: '=' },
  { value: 'BULK', label: '체중 증량', description: '유지 칼로리보다 300kcal 더', icon: '↑' },
]

/**
 * 신체 정보 시작값 — 처음 보는 숫자에서 조절을 시작하는 횟수를 줄이려는 값이다.
 *
 * 키는 20~30대 평균(건강검진통계 기준 남 174.4~174.7 / 여 161.8~161.9)을 반올림했다.
 * 체중은 같은 연령대 평균의 근사치다 — 통계 표를 직접 확인하지 못해 키만큼 단단한 값은 아니다.
 * 어차피 바로 고칠 수 있는 시작점이므로 정확도보다 "대부분이 조금만 움직이면 되는 자리"가 목적이다.
 */
export const BODY_DEFAULTS: Record<Gender, { heightCm: number; weightKg: number }> = {
  MALE: { heightCm: 174, weightKg: 75 },
  FEMALE: { heightCm: 162, weightKg: 58 },
}

/** 나이 시작값 — 앱을 처음 쓰는 층에 맞춘다 */
export const AGE_DEFAULT = 25
