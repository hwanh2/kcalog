import { toNumber } from '../../api/memberValidation'
import { Field, TextInput } from '../../ui/form'
import { KCAL_MAX, MACRO_MAX, NAME_MAX } from '../meal/mealItems'

/** 직접 입력한 음식 한 항목 — 입력 중에는 문자열로 두고 제출 시 검증·변환한다 */
export interface FoodDraft {
  name: string
  quantity: string
  unit: string
  kcal: string
  carbG: string
  proteinG: string
  fatG: string
}

export type FoodDraftErrors = Partial<Record<keyof FoodDraft, string>>

export function emptyDraft(name = ''): FoodDraft {
  return { name, quantity: '1', unit: '인분', kcal: '', carbG: '', proteinG: '', fatG: '' }
}

/** 이름·수량·단위·영양 입력 — 수동 기록 시트와 즐겨찾기 저장 시트가 공유한다 */
export function FoodForm({
  draft,
  errors,
  onChange,
  idPrefix,
}: {
  draft: FoodDraft
  errors: FoodDraftErrors
  onChange: (patch: Partial<FoodDraft>) => void
  idPrefix: string
}) {
  const id = (field: string) => `${idPrefix}-${field}`
  return (
    <>
      <Field id={id('name')} label="이름" error={errors.name}>
        <TextInput id={id('name')} value={draft.name} onChange={(e) => onChange({ name: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field id={id('quantity')} label="수량" error={errors.quantity}>
          <TextInput
            id={id('quantity')}
            inputMode="decimal"
            value={draft.quantity}
            onChange={(e) => onChange({ quantity: e.target.value })}
          />
        </Field>
        <Field id={id('unit')} label="단위" error={errors.unit}>
          <TextInput
            id={id('unit')}
            placeholder="개 · 공기 · g"
            value={draft.unit}
            onChange={(e) => onChange({ unit: e.target.value })}
          />
        </Field>
      </div>
      <Field id={id('kcal')} label="칼로리 (kcal)" error={errors.kcal}>
        <TextInput
          id={id('kcal')}
          inputMode="numeric"
          value={draft.kcal}
          onChange={(e) => onChange({ kcal: e.target.value })}
        />
      </Field>
      <div className="grid grid-cols-3 gap-2">
        <Field id={id('carb')} label="탄 (g)" error={errors.carbG}>
          <TextInput
            id={id('carb')}
            inputMode="decimal"
            value={draft.carbG}
            onChange={(e) => onChange({ carbG: e.target.value })}
          />
        </Field>
        <Field id={id('protein')} label="단 (g)" error={errors.proteinG}>
          <TextInput
            id={id('protein')}
            inputMode="decimal"
            value={draft.proteinG}
            onChange={(e) => onChange({ proteinG: e.target.value })}
          />
        </Field>
        <Field id={id('fat')} label="지 (g)" error={errors.fatG}>
          <TextInput
            id={id('fat')}
            inputMode="decimal"
            value={draft.fatG}
            onChange={(e) => onChange({ fatG: e.target.value })}
          />
        </Field>
      </div>
    </>
  )
}

/** 백엔드 제약의 거울 — 이름 필수, 수량 0 초과, 단위 필수, kcal 정수, 탄단지 소수 1자리 */
export function validateDraft(draft: FoodDraft): FoodDraftErrors {
  const errors: FoodDraftErrors = {}
  if (draft.name.trim() === '') errors.name = '이름을 입력해주세요'
  else if (draft.name.length > NAME_MAX) errors.name = `${NAME_MAX}자 이내로 입력해주세요`

  const quantity = toNumber(draft.quantity)
  if (quantity === null || quantity <= 0) errors.quantity = '0보다 큰 수량을 입력해주세요'
  if (draft.unit.trim() === '') errors.unit = '단위를 입력해주세요'

  const kcal = toNumber(draft.kcal)
  if (kcal === null || kcal < 0 || kcal > KCAL_MAX || !Number.isInteger(kcal))
    errors.kcal = `0~${KCAL_MAX} 정수여야 합니다`

  const macro = (value: string): string | undefined => {
    const n = toNumber(value)
    if (n === null || n < 0 || n > MACRO_MAX) return `0~${MACRO_MAX} 범위여야 합니다`
    if (Math.abs(n * 10 - Math.round(n * 10)) > 1e-9) return '소수 첫째 자리까지만 입력해주세요'
    return undefined
  }
  const carbG = macro(draft.carbG)
  const proteinG = macro(draft.proteinG)
  const fatG = macro(draft.fatG)
  if (carbG) errors.carbG = carbG
  if (proteinG) errors.proteinG = proteinG
  if (fatG) errors.fatG = fatG
  return errors
}

/** 검증을 통과한 초안의 숫자 값 */
export function draftValues(draft: FoodDraft) {
  return {
    name: draft.name.trim(),
    quantity: toNumber(draft.quantity)!,
    unit: draft.unit.trim(),
    kcal: toNumber(draft.kcal)!,
    carbG: toNumber(draft.carbG)!,
    proteinG: toNumber(draft.proteinG)!,
    fatG: toNumber(draft.fatG)!,
  }
}
