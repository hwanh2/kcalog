/** 프로필 입력 검증 경계값 — 백엔드 MemberValidation의 거울 (온보딩·프로필 폼 공유) */
export const HEIGHT_CM_MIN = 100
export const HEIGHT_CM_MAX = 230
export const WEIGHT_KG_MIN = 30
export const WEIGHT_KG_MAX = 250
export const BIRTH_YEAR_MIN = 1920
export const DAILY_KCAL_MIN = 800
export const DAILY_KCAL_MAX = 10_000

export type FieldErrors = Record<string, string>

/** 문자열 입력을 숫자로 — 비어있거나 숫자가 아니면 null */
export function toNumber(raw: string): number | null {
  if (raw.trim() === '') return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

function range(value: number | null, min: number, max: number, message: string): string | null {
  return value === null || value < min || value > max ? message : null
}

/** 존재하는 필드만 검사해 항목별 오류를 돌려준다 (온보딩은 전체, 프로필 수정은 일부 전달) */
export function validateProfileFields(fields: {
  birthYear?: number | null
  heightCm?: number | null
  weightKg?: number | null
  targetWeightKg?: number | null
  dailyKcalTarget?: number | null
}): FieldErrors {
  const errors: FieldErrors = {}
  const currentYear = new Date().getFullYear()

  if ('birthYear' in fields) {
    const message = range(fields.birthYear ?? null, BIRTH_YEAR_MIN, currentYear,
      `출생연도는 ${BIRTH_YEAR_MIN}~${currentYear} 범위여야 합니다`)
    if (message) errors.birthYear = message
  }
  if ('heightCm' in fields) {
    const message = range(fields.heightCm ?? null, HEIGHT_CM_MIN, HEIGHT_CM_MAX,
      `키는 ${HEIGHT_CM_MIN}~${HEIGHT_CM_MAX}cm 범위여야 합니다`)
    if (message) errors.heightCm = message
  }
  if ('weightKg' in fields) {
    const message = range(fields.weightKg ?? null, WEIGHT_KG_MIN, WEIGHT_KG_MAX,
      `체중은 ${WEIGHT_KG_MIN}~${WEIGHT_KG_MAX}kg 범위여야 합니다`)
    if (message) errors.weightKg = message
  }
  if ('targetWeightKg' in fields) {
    const message = range(fields.targetWeightKg ?? null, WEIGHT_KG_MIN, WEIGHT_KG_MAX,
      `목표 체중은 ${WEIGHT_KG_MIN}~${WEIGHT_KG_MAX}kg 범위여야 합니다`)
    if (message) errors.targetWeightKg = message
  }
  if ('dailyKcalTarget' in fields) {
    const message = range(fields.dailyKcalTarget ?? null, DAILY_KCAL_MIN, DAILY_KCAL_MAX,
      `일일 칼로리 목표는 ${DAILY_KCAL_MIN}~${DAILY_KCAL_MAX} 범위여야 합니다`)
    if (message) errors.dailyKcalTarget = message
  }
  return errors
}
