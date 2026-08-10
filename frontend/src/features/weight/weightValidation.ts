import { toNumber } from '../../api/memberValidation'

// 백엔드 MemberValidation·컬럼 NUMERIC(4,1)의 거울
export const WEIGHT_MIN = 30
export const WEIGHT_MAX = 250

/** 체중 입력 검증 — 30~250kg, 소수 1자리까지. 통과하면 숫자, 아니면 오류 문구 */
export function validateWeight(raw: string): { value: number } | { error: string } {
  const n = toNumber(raw)
  if (n === null || n < WEIGHT_MIN || n > WEIGHT_MAX) return { error: `${WEIGHT_MIN}~${WEIGHT_MAX}kg 범위여야 합니다` }
  if (Math.abs(n * 10 - Math.round(n * 10)) > 1e-9) return { error: '소수 첫째 자리까지만 입력해주세요' }
  return { value: n }
}
