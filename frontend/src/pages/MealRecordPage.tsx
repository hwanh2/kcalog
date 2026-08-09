import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../api/client'
import { analyzeMeal, saveMeal } from '../api/meal'
import type { MealSource, MealType } from '../api/meal'
import { resizeImage } from '../features/meal/imageResize'
import { MEAL_TYPE_LABELS, defaultMealType } from '../features/meal/mealDefaults'
import { MealItemsEditor, TotalsLine } from '../features/meal/MealItemsEditor'
import { PhotoOverlay } from '../features/meal/PhotoOverlay'
import { ItemEditSheet } from '../features/meal/ItemEditSheet'
import {
  MAX_ITEMS,
  emptyItem,
  fromAnalyzed,
  isValidBox,
  shouldOverlay,
  toSaveItems,
  validateItems,
} from '../features/meal/mealItems'
import type { EditableItem, ItemErrors } from '../features/meal/mealItems'
import { Button, Card, Field, Select } from '../ui/form'

type Step = 'input' | 'analyzing' | 'confirm'

/** 식사 기록: ① 사진 선택 or 직접 입력 → ② (사진이면) 음식별 분석 → ③ 오버레이-편집/리스트로 확인·수정 → 저장.
 *  오버레이 모드는 분석 시점에 shouldOverlay로 한 번 결정해 고정한다(항목 추가로 모드가 뒤집히지 않게) */
export function MealRecordPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [step, setStep] = useState<Step>('input')
  const [source, setSource] = useState<MealSource>('MANUAL')
  const [mealType, setMealType] = useState<MealType>(() => defaultMealType(new Date()))
  const [items, setItems] = useState<EditableItem[]>([])
  const [overlayMode, setOverlayMode] = useState(false)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [itemErrors, setItemErrors] = useState<ItemErrors[]>([])
  const [formError, setFormError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // 미리보기 blob URL은 메모리에만 두고(사진 미저장), 교체·언마운트 시 해제한다
  useEffect(() => {
    if (!photoUrl) return
    return () => URL.revokeObjectURL(photoUrl)
  }, [photoUrl])

  // 항목 변경 시 오류 초기화 — 인덱스 어긋남 방지 + 입력하면 오류가 사라지는 UX
  function updateItems(next: EditableItem[]) {
    setItems(next)
    setItemErrors([])
    setFormError(null)
  }
  function patchEditing(patch: Partial<EditableItem>) {
    if (editingIndex === null) return
    updateItems(items.map((it, i) => (i === editingIndex ? { ...it, ...patch } : it)))
  }
  function removeItem(i: number) {
    updateItems(items.filter((_, idx) => idx !== i))
    setEditingIndex(null)
  }
  function addItem() {
    const next = [...items, emptyItem()]
    updateItems(next)
    setEditingIndex(next.length - 1) // 새 항목 편집 시트를 바로 연다
  }

  const hasError = (i: number) => (itemErrors[i] ? Object.keys(itemErrors[i]).length > 0 : false)
  const errorIndices = items.map((_, i) => i).filter(hasError)
  const boxless = items.map((it, i) => ({ it, i })).filter(({ it }) => !isValidBox(it.box))

  async function onPickPhoto(file: File) {
    setNotice(null)
    setPhotoUrl(URL.createObjectURL(file))
    setStep('analyzing')
    try {
      const resized = await resizeImage(file)
      const result = await analyzeMeal(resized)
      if (result.foodFound && result.items.length > 0) {
        const analyzed = result.items.map(fromAnalyzed)
        setSource('AI')
        setItems(analyzed)
        // 박스 품질·신뢰도로 오버레이 여부를 이 시점에 확정
        setOverlayMode(shouldOverlay(analyzed, result.overallConfidence))
      } else {
        setSource('MANUAL')
        setItems([emptyItem()])
        setOverlayMode(false)
        setNotice(result.notes || '음식을 찾지 못했어요. 직접 입력해주세요.')
      }
    } catch (error) {
      // 분석 실패(502·429 등) → 수동 입력 폴백
      setSource('MANUAL')
      setItems([emptyItem()])
      setOverlayMode(false)
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
    setOverlayMode(false)
    setPhotoUrl(null)
    setNotice(null)
    setStep('confirm')
  }

  async function save() {
    const result = validateItems(items)
    setItemErrors(result.itemErrors)
    setFormError(result.formError)
    if (!result.valid) {
      // 오버레이 모드는 필드가 안 보이므로, 첫 오류 항목 편집 시트를 열어 오류를 드러낸다
      if (overlayMode) {
        const firstBad = result.itemErrors.findIndex((e) => Object.keys(e).length > 0)
        if (firstBad >= 0) setEditingIndex(firstBad)
      }
      return
    }

    setBusy(true)
    try {
      await saveMeal({
        eatenAt: new Date().toISOString(),
        mealType,
        source,
        items: toSaveItems(items),
      })
      await queryClient.invalidateQueries({ queryKey: ['meals'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] }) // 오늘 탭 집계 갱신
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
            <p className="mb-3 text-sm text-brand">
              AI 추정값이에요. {overlayMode ? '사진 속 음식을 눌러 수정할 수 있어요.' : '확인하고 수정할 수 있어요.'}
            </p>
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

          {photoUrl && overlayMode ? (
            // 오버레이-편집 모드: 사진 위 박스 탭 편집 + 총량 + 위치 없는 항목 칩
            <>
              <div className="mb-3">
                <PhotoOverlay src={photoUrl} items={items} onSelect={setEditingIndex} errorIndices={errorIndices} />
              </div>
              <TotalsLine items={items} />

              {boxless.length > 0 && (
                <div className="mt-3">
                  <p className="mb-1 text-xs text-muted">위치 없는 항목</p>
                  <div className="flex flex-wrap gap-2">
                    {boxless.map(({ it, i }) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setEditingIndex(i)}
                        aria-label={`${it.name || '이름 없음'} 편집`}
                        className={`rounded-full border px-3 py-1 text-sm ${
                          hasError(i) ? 'border-danger text-danger' : 'border-border text-ink'
                        }`}
                      >
                        {it.name || '이름 없음'} {it.kcal || 0}kcal
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {formError && (
                <p role="alert" className="mt-2 text-sm text-danger">
                  {formError}
                </p>
              )}

              <Button
                type="button"
                variant="secondary"
                onClick={addItem}
                disabled={items.length >= MAX_ITEMS}
                className="mt-3 w-full"
              >
                + 음식 추가
              </Button>
            </>
          ) : (
            // 리스트 폴백 모드
            <>
              {photoUrl && <img src={photoUrl} alt="식사 사진" className="mb-4 block w-full rounded-md" />}
              <MealItemsEditor
                items={items}
                errors={itemErrors}
                formError={formError}
                onChange={updateItems}
                idPrefix="rec"
              />
            </>
          )}

          <Button type="button" onClick={save} disabled={busy} className="mt-4 w-full">
            저장
          </Button>
        </Card>
      )}

      {editingIndex !== null && items[editingIndex] && (
        <ItemEditSheet
          item={items[editingIndex]}
          errors={itemErrors[editingIndex] ?? {}}
          onChange={patchEditing}
          onDelete={() => removeItem(editingIndex)}
          onClose={() => setEditingIndex(null)}
        />
      )}
    </section>
  )
}
