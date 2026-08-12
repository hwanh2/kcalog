import type { ActivityLevel, Goal } from '../../api/member'

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
  { value: 'BULK', label: '근육 증량', description: '유지 칼로리보다 300kcal 더', icon: '↑' },
]
