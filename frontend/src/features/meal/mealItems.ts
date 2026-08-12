import type { AnalyzedItem, BoundingBox, MealItem, MealItemInput } from '../../api/meal'
import { toNumber } from '../../api/memberValidation'
import { round1 } from '../../lib/number'

// 백엔드 MealValidation의 거울
export const KCAL_MAX = 10_000
export const MACRO_MAX = 2000
export const NAME_MAX = 100
export const MAX_ITEMS = 30

/** 오버레이 모드로 볼 최소 신뢰도 — eval 실측 후 조정할 수 있는 플래그(design D2) */
export const OVERLAY_CONFIDENCE_THRESHOLD = 0.5

/** 이 값 미만이면 "확인 필요" 표시로 정정을 유도한다(백엔드 design D8과 동일 기준) */
export const LOW_CONFIDENCE_THRESHOLD = 0.7

/** 편집 중 항목 — 입력은 문자열로 보관(부분 입력 허용), 저장 시 숫자 변환·검증한다.
 *  box는 오버레이 렌더링 전용이며 저장 요청엔 포함하지 않는다(없을 수 있음).
 *  remember=사용자가 "이 값 기억하기"를 켰는지(저장 시 전송), corrected=개인 보정값으로 대체된 항목(읽기 전용 배지) */
export interface EditableItem {
  name: string
  kcal: string
  carbG: string
  proteinG: string
  fatG: string
  /** 섭취량 — 없을 수 있다(직접 입력). 영양값은 이미 이 수량이 반영된 총량 */
  quantity: string
  unit: string
  box: BoundingBox | null
  remember: boolean
  corrected: boolean
}

export type ItemErrors = Partial<Record<'name' | 'kcal' | 'carbG' | 'proteinG' | 'fatG', string>>

export function emptyItem(): EditableItem {
  return {
    name: '',
    kcal: '',
    carbG: '',
    proteinG: '',
    fatG: '',
    quantity: '',
    unit: '',
    box: null,
    remember: false,
    corrected: false,
  }
}

/** 분석 결과 항목 → 편집 항목 (숫자를 문자열로). corrected는 개인 보정 적용 여부를 이어받는다 */
export function fromAnalyzed(item: AnalyzedItem): EditableItem {
  return {
    name: item.name,
    kcal: String(item.kcal),
    carbG: String(item.carbG),
    proteinG: String(item.proteinG),
    fatG: String(item.fatG),
    quantity: item.amount === null ? '' : String(item.amount),
    unit: item.unit ?? '',
    box: item.box,
    remember: false,
    corrected: item.corrected,
  }
}

/** 카탈로그·즐겨찾기 항목을 선택 수량으로 담을 때의 편집 항목 */
export function fromFood(
  food: { name: string; unit: string },
  quantity: number,
  nutrition: { kcal: number; carbG: number; proteinG: number; fatG: number },
): EditableItem {
  return {
    name: food.name,
    kcal: String(nutrition.kcal),
    carbG: String(nutrition.carbG),
    proteinG: String(nutrition.proteinG),
    fatG: String(nutrition.fatG),
    quantity: String(quantity),
    unit: food.unit,
    box: null,
    remember: false,
    corrected: false,
  }
}

/** 저장된 항목 → 편집 항목 (기록 탭 수정용, box 없음) */
export function fromSaved(item: MealItem): EditableItem {
  return {
    name: item.name,
    kcal: String(item.kcal),
    carbG: String(item.carbG),
    proteinG: String(item.proteinG),
    fatG: String(item.fatG),
    quantity: item.quantity === null ? '' : String(item.quantity),
    unit: item.unit ?? '',
    box: null,
    remember: false,
    corrected: false,
  }
}

/** 항목 합계 — 화면 실시간 표시용. 파싱 불가 값은 0으로 본다 */
export function totals(items: EditableItem[]): { kcal: number; carbG: number; proteinG: number; fatG: number } {
  const num = (s: string) => {
    const n = Number(s)
    return Number.isFinite(n) ? n : 0
  }
  const raw = items.reduce(
    (acc, it) => ({
      kcal: acc.kcal + num(it.kcal),
      carbG: acc.carbG + num(it.carbG),
      proteinG: acc.proteinG + num(it.proteinG),
      fatG: acc.fatG + num(it.fatG),
    }),
    { kcal: 0, carbG: 0, proteinG: 0, fatG: 0 },
  )
  // 매크로 합산은 소수 1자리 반올림 — 0.1+0.2 같은 부동소수 잔차를 화면에 노출하지 않는다
  return { kcal: raw.kcal, carbG: round1(raw.carbG), proteinG: round1(raw.proteinG), fatG: round1(raw.fatG) }
}

/** box가 정규화 좌표(0~1)로 유효한지 — 오버레이를 그릴 수 있는 박스인지 판정 */
export function isValidBox(box: BoundingBox | null): box is BoundingBox {
  if (!box) return false
  const inUnit = (v: number) => Number.isFinite(v) && v >= 0 && v <= 1
  return (
    inUnit(box.x) &&
    inUnit(box.y) &&
    box.w > 0 &&
    box.h > 0 &&
    box.x + box.w <= 1.0001 && // 부동소수 여유
    box.y + box.h <= 1.0001
  )
}

/** 오버레이 모드 여부 — 모든 항목에 유효한 box가 있고 신뢰도가 임계 이상일 때만.
 *  아니면 목록형으로 폴백(design D2) */
export function shouldOverlay(
  items: EditableItem[],
  confidence: number,
  threshold: number = OVERLAY_CONFIDENCE_THRESHOLD,
): boolean {
  return items.length > 0 && confidence >= threshold && items.every((it) => isValidBox(it.box))
}

/** 항목별 검증 — 이름 필수·길이, kcal 0~10000 정수, 탄단지 0~2000. 백엔드 제약의 거울 */
export function validateItem(item: EditableItem): ItemErrors {
  const errors: ItemErrors = {}
  if (item.name.trim().length === 0) errors.name = '이름을 입력해주세요'
  else if (item.name.length > NAME_MAX) errors.name = `${NAME_MAX}자 이내로 입력해주세요`

  const kcal = toNumber(item.kcal)
  if (kcal === null || kcal < 0 || kcal > KCAL_MAX || !Number.isInteger(kcal))
    errors.kcal = `0~${KCAL_MAX} 정수여야 합니다`

  const macro = (v: string): string | undefined => {
    const n = toNumber(v)
    if (n === null || n < 0 || n > MACRO_MAX) return `0~${MACRO_MAX} 범위여야 합니다`
    // 백엔드 @Digits(fraction=1)·NUMERIC(5,1) 거울 — 소수 둘째자리는 저장 시 400이므로 미리 막는다
    if (Math.abs(n * 10 - Math.round(n * 10)) > 1e-9) return '소수 첫째 자리까지만 입력해주세요'
    return undefined
  }
  const carbG = macro(item.carbG)
  const proteinG = macro(item.proteinG)
  const fatG = macro(item.fatG)
  if (carbG) errors.carbG = carbG
  if (proteinG) errors.proteinG = proteinG
  if (fatG) errors.fatG = fatG
  return errors
}

/** 전체 검증 — 항목이 없거나(formError) 어느 항목이 유효하지 않으면 저장 불가 */
export function validateItems(items: EditableItem[]): {
  valid: boolean
  itemErrors: ItemErrors[]
  formError: string | null
} {
  const itemErrors = items.map(validateItem)
  const formError =
    items.length === 0
      ? '음식 항목을 하나 이상 추가해주세요'
      : items.length > MAX_ITEMS
        ? `항목은 최대 ${MAX_ITEMS}개까지 저장할 수 있어요`
        : null
  const valid = formError === null && itemErrors.every((e) => Object.keys(e).length === 0)
  return { valid, itemErrors, formError }
}

/** 편집 항목 → 저장 요청 항목 (검증 통과 가정, box 제외). remember=true면 개인 보정 학습을 요청 */
export function toSaveItems(items: EditableItem[]): MealItemInput[] {
  return items.map((it) => {
    const quantity = toNumber(it.quantity)
    const hasAmount = quantity !== null && quantity > 0 && it.unit.trim() !== ''
    return {
      name: it.name.trim(),
      kcal: toNumber(it.kcal)!,
      carbG: toNumber(it.carbG)!,
      proteinG: toNumber(it.proteinG)!,
      fatG: toNumber(it.fatG)!,
      ...(hasAmount ? { quantity, unit: it.unit.trim() } : {}),
      ...(it.remember ? { remember: true } : {}),
    }
  })
}
