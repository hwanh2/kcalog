import { Button, Field, TextInput } from '../../ui/form'
import type { EditableItem, ItemErrors } from './mealItems'

/** 단일 음식 편집 바텀시트 — 오버레이 박스 탭·칩 탭으로 열린다. 이름·kcal·탄단지 수정·삭제.
 *  검증(mealItems.validateItems)은 저장 시 부모가 수행하고, 필드 오류만 여기서 표시한다 */
export function ItemEditSheet({
  item,
  errors,
  onChange,
  onDelete,
  onClose,
}: {
  item: EditableItem
  errors: ItemErrors
  onChange: (patch: Partial<EditableItem>) => void
  onDelete: () => void
  onClose: () => void
}) {
  return (
    <div role="dialog" aria-label="음식 편집" aria-modal="true" className="fixed inset-0 z-50 flex items-end">
      <button type="button" aria-label="닫기" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full rounded-t-card bg-surface p-4 shadow-lg">
        <Field id="sheet-name" label="이름" error={errors.name}>
          <TextInput id="sheet-name" value={item.name} onChange={(e) => onChange({ name: e.target.value })} />
        </Field>
        <Field id="sheet-kcal" label="칼로리 (kcal)" error={errors.kcal}>
          <TextInput
            id="sheet-kcal"
            inputMode="numeric"
            value={item.kcal}
            onChange={(e) => onChange({ kcal: e.target.value })}
          />
        </Field>
        <div className="grid grid-cols-3 gap-2">
          <Field id="sheet-carb" label="탄 (g)" error={errors.carbG}>
            <TextInput
              id="sheet-carb"
              inputMode="decimal"
              value={item.carbG}
              onChange={(e) => onChange({ carbG: e.target.value })}
            />
          </Field>
          <Field id="sheet-protein" label="단 (g)" error={errors.proteinG}>
            <TextInput
              id="sheet-protein"
              inputMode="decimal"
              value={item.proteinG}
              onChange={(e) => onChange({ proteinG: e.target.value })}
            />
          </Field>
          <Field id="sheet-fat" label="지 (g)" error={errors.fatG}>
            <TextInput
              id="sheet-fat"
              inputMode="decimal"
              value={item.fatG}
              onChange={(e) => onChange({ fatG: e.target.value })}
            />
          </Field>
        </div>
        <div className="mt-2 flex gap-2">
          <Button type="button" variant="ghost" onClick={onDelete} className="text-danger">
            삭제
          </Button>
          <Button type="button" onClick={onClose} className="flex-1">
            완료
          </Button>
        </div>
      </div>
    </div>
  )
}
