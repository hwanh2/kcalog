import { Field, TextInput } from '../../ui/form'
import type { EditableItem, ItemErrors } from './mealItems'

/** 음식 한 항목의 영양 입력 필드(이름·칼로리·탄·단·지) — 리스트 편집기와 편집 시트가 공유한다.
 *  라벨·inputMode·error 키 계약을 한 곳에 두어 두 편집 UI가 어긋나지 않게 한다.
 *  onChange는 바뀐 부분만 patch로 올린다(box 등 나머지는 호출측이 보존) */
export function ItemNutritionFields({
  item,
  errors,
  onChange,
  idPrefix,
}: {
  item: EditableItem
  errors: ItemErrors
  onChange: (patch: Partial<EditableItem>) => void
  idPrefix: string
}) {
  const id = (f: string) => `${idPrefix}-${f}`
  return (
    <>
      <Field id={id('name')} label="이름" error={errors.name}>
        <TextInput id={id('name')} value={item.name} onChange={(e) => onChange({ name: e.target.value })} />
      </Field>
      <Field id={id('kcal')} label="칼로리 (kcal)" error={errors.kcal}>
        <TextInput
          id={id('kcal')}
          inputMode="numeric"
          value={item.kcal}
          onChange={(e) => onChange({ kcal: e.target.value })}
        />
      </Field>
      <div className="grid grid-cols-3 gap-2">
        <Field id={id('carb')} label="탄 (g)" error={errors.carbG}>
          <TextInput
            id={id('carb')}
            inputMode="decimal"
            value={item.carbG}
            onChange={(e) => onChange({ carbG: e.target.value })}
          />
        </Field>
        <Field id={id('protein')} label="단 (g)" error={errors.proteinG}>
          <TextInput
            id={id('protein')}
            inputMode="decimal"
            value={item.proteinG}
            onChange={(e) => onChange({ proteinG: e.target.value })}
          />
        </Field>
        <Field id={id('fat')} label="지 (g)" error={errors.fatG}>
          <TextInput
            id={id('fat')}
            inputMode="decimal"
            value={item.fatG}
            onChange={(e) => onChange({ fatG: e.target.value })}
          />
        </Field>
      </div>
    </>
  )
}
