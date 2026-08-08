import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../api/client'
import { analyzeMeal, saveMeal } from '../api/meal'
import type { MealSource, MealType } from '../api/meal'
import { resizeImage } from '../features/meal/imageResize'
import { MEAL_TYPE_LABELS, defaultMealType } from '../features/meal/mealDefaults'
import { MealItemsEditor } from '../features/meal/MealItemsEditor'
import { PhotoOverlay } from '../features/meal/PhotoOverlay'
import {
  emptyItem,
  fromAnalyzed,
  shouldOverlay,
  toSaveItems,
  validateItems,
} from '../features/meal/mealItems'
import type { EditableItem, ItemErrors } from '../features/meal/mealItems'
import { Button, Card, Field, Select } from '../ui/form'

type Step = 'input' | 'analyzing' | 'confirm'

/** 식사 기록: ① 사진 선택 or 직접 입력 → ② (사진이면) 음식별 분석 → ③ 오버레이/목록으로 확인·수정 → 저장 */
export function MealRecordPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [step, setStep] = useState<Step>('input')
  const [source, setSource] = useState<MealSource>('MANUAL')
  const [mealType, setMealType] = useState<MealType>(() => defaultMealType(new Date()))
  const [items, setItems] = useState<EditableItem[]>([])
  const [confidence, setConfidence] = useState(0)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [itemErrors, setItemErrors] = useState<ItemErrors[]>([])
  const [formError, setFormError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // 미리보기 blob URL은 메모리에만 두고(사진 미저장), 교체·언마운트 시 해제한다
  useEffect(() => {
    if (!photoUrl) return
    return () => URL.revokeObjectURL(photoUrl)
  }, [photoUrl])

  const overlay = shouldOverlay(items, confidence)

  async function onPickPhoto(file: File) {
    setNotice(null)
    setPhotoUrl(URL.createObjectURL(file))
    setStep('analyzing')
    try {
      const resized = await resizeImage(file)
      const result = await analyzeMeal(resized)
      if (result.foodFound && result.items.length > 0) {
        setSource('AI')
        setItems(result.items.map(fromAnalyzed))
        setConfidence(result.overallConfidence)
      } else {
        setSource('MANUAL')
        setItems([emptyItem()])
        setNotice(result.notes || '음식을 찾지 못했어요. 직접 입력해주세요.')
      }
    } catch (error) {
      // 분석 실패(502·429 등) → 수동 입력 폴백
      setSource('MANUAL')
      setItems([emptyItem()])
      setNotice(
        error instanceof ApiError && error.status === 429
          ? '오늘 분석 횟수를 초과했어요. 직접 입력해주세요.'
          : '사진 분석에 실패했어요. 직접 입력해주세요.',
      )
    }
    setStep('confirm')
  }

  function startManual() {
    setSource('MANUAL')
    setItems([emptyItem()])
    setPhotoUrl(null)
    setNotice(null)
    setStep('confirm')
  }

  async function save() {
    const result = validateItems(items)
    setItemErrors(result.itemErrors)
    setFormError(result.formError)
    if (!result.valid) return

    setBusy(true)
    try {
      await saveMeal({
        eatenAt: new Date().toISOString(),
        mealType,
        source,
        items: toSaveItems(items),
      })
      await queryClient.invalidateQueries({ queryKey: ['meals'] })
      navigate('/')
    } catch {
      setNotice('저장에 실패했어요. 잠시 후 다시 시도해주세요.')
      setBusy(false)
    }
  }

  return (
    <section>
      <h1 className="text-xl font-semibold">식사 기록</h1>

      {step === 'input' && (
        <Card className="mt-4">
          <p className="mb-4 text-muted">사진을 찍으면 AI가 음식별 칼로리를 추정해요.</p>
          <label className="mb-3 block w-full cursor-pointer rounded-md bg-brand py-3 text-center font-medium text-on-brand">
            사진 촬영·선택
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void onPickPhoto(file)
              }}
            />
          </label>
          <Button type="button" variant="secondary" onClick={startManual} className="w-full">
            직접 입력
          </Button>
        </Card>
      )}

      {step === 'analyzing' && (
        <Card className="mt-4">
          <p className="text-center text-muted">사진을 분석하고 있어요…</p>
        </Card>
      )}

      {step === 'confirm' && (
        <Card className="mt-4">
          {notice && (
            <p role="status" className="mb-3 text-sm text-muted">
              {notice}
            </p>
          )}
          {source === 'AI' && (
            <p className="mb-3 text-sm text-brand">AI 추정값이에요. 확인하고 수정할 수 있어요.</p>
          )}

          {photoUrl && (
            <div className="mb-4">
              {overlay ? (
                <PhotoOverlay src={photoUrl} items={items} />
              ) : (
                <img src={photoUrl} alt="식사 사진" className="block w-full rounded-md" />
              )}
            </div>
          )}

          <Field id="mealType" label="끼니">
            <Select id="mealType" value={mealType} onChange={(e) => setMealType(e.target.value as MealType)}>
              {Object.entries(MEAL_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>

          <MealItemsEditor
            items={items}
            errors={itemErrors}
            formError={formError}
            onChange={setItems}
            idPrefix="rec"
          />

          <Button type="button" onClick={save} disabled={busy} className="mt-4 w-full">
            저장
          </Button>
        </Card>
      )}
    </section>
  )
}
