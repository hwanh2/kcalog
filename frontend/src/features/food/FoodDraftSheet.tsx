import { useState } from 'react'
import type { MealType } from '../../api/meal'
import { MEAL_TYPE_LABELS } from '../meal/mealDefaults'
import { Button } from '../../ui/form'
import { Sheet } from '../../ui/Sheet'
import { FoodForm, draftValues, emptyDraft, validateDraft } from './FoodForm'
import type { FoodDraft, FoodDraftErrors } from './FoodForm'

export type DraftValues = ReturnType<typeof draftValues>

/**
 * 직접 입력 시트 — 두 곳에서 쓴다(design D5·18).
 *   mode="record"    검색 결과가 없거나 "AI 없이 직접 입력"에서 → 그 끼니로 바로 기록
 *   mode="favorite"  즐겨찾기 "직접 만들기"·분석 결과 ★ 저장 → 내 라이브러리에 저장
 * favorite 모드에는 "AI 분석에도 반영" 선택이 붙는다(개인 보정치 동시 저장 — design D6).
 */
export function FoodDraftSheet({
  mode,
  mealType,
  initial,
  busy,
  onSubmit,
  onClose,
}: {
  mode: 'record' | 'favorite'
  mealType?: MealType
  initial?: Partial<FoodDraft>
  busy?: boolean
  onSubmit: (values: DraftValues, rememberForAnalysis: boolean) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState<FoodDraft>(() => ({ ...emptyDraft(), ...initial }))
  const [errors, setErrors] = useState<FoodDraftErrors>({})
  const [remember, setRemember] = useState(false)

  const title = mode === 'favorite' ? '즐겨찾기에 저장' : '직접 입력'
  const submitLabel =
    mode === 'favorite' ? '즐겨찾기에 저장' : `${MEAL_TYPE_LABELS[mealType ?? 'BREAKFAST']}에 기록하기`

  function submit() {
    const found = validateDraft(draft)
    setErrors(found)
    if (Object.keys(found).length > 0) return
    onSubmit(draftValues(draft), remember)
  }

  return (
    <Sheet label={title} onClose={onClose}>
      <p className="mb-3 text-lg font-bold text-ink">{title}</p>
      <FoodForm
        draft={draft}
        errors={errors}
        onChange={(patch) => {
          setDraft((prev) => ({ ...prev, ...patch }))
          setErrors({})
        }}
        idPrefix={`draft-${mode}`}
      />

      {mode === 'favorite' && (
        <label className="mt-1 flex items-start gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            이 값을 AI 분석에도 반영
            <span className="ml-1 text-xs text-muted">사진에서 같은 음식이 나오면 이 값으로 계산돼요</span>
          </span>
        </label>
      )}

      <Button type="button" onClick={submit} disabled={busy} className="mt-4 w-full py-3">
        {submitLabel}
      </Button>
    </Sheet>
  )
}
