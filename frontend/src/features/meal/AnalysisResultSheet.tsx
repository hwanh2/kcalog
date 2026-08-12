import { useState } from 'react'
import { MAX_REANALYSIS, reanalyze } from '../../api/analysis'
import type { Analysis } from '../../api/analysis'
import { ApiError } from '../../api/client'
import { saveFavorite } from '../../api/food'
import type { MealType } from '../../api/meal'
import { Button } from '../../ui/form'
import { Sheet } from '../../ui/Sheet'
import { FoodDraftSheet } from '../food/FoodDraftSheet'
import type { DraftValues } from '../food/FoodDraftSheet'
import { AnalysisSummary, AnalyzedItemList } from './AnalysisSummary'
import { ItemEditSheet } from './ItemEditSheet'
import { PhotoOverlay } from './PhotoOverlay'
import { MEAL_TYPE_LABELS } from './mealDefaults'
import { pollAnalysis } from './pollAnalysis'
import {
  LOW_CONFIDENCE_THRESHOLD,
  MAX_ITEMS,
  emptyItem,
  fromAnalyzed,
  shouldOverlay,
  validateItems,
} from './mealItems'
import type { EditableItem, ItemErrors } from './mealItems'

/**
 * 분석 결과 확인 시트 — 사진 오버레이(있으면)·요약·항목 리스트로 확인하고 수정한 뒤 그 끼니로 저장한다.
 * 설명을 덧붙여 재분석할 수 있고(작업당 2회), 항목을 즐겨찾기로 저장할 수 있다.
 * 사진 없는(설명만) 분석은 목록형으로만 보여준다.
 */
export function AnalysisResultSheet({
  analysis,
  photoUrl,
  mealType,
  busy,
  onAnalysisChange,
  onSave,
  onClose,
}: {
  analysis: Analysis
  photoUrl: string | null
  mealType: MealType
  busy?: boolean
  onAnalysisChange: (next: Analysis) => void
  onSave: (items: EditableItem[]) => void
  onClose: () => void
}) {
  const [items, setItems] = useState<EditableItem[]>(() => (analysis.result?.items ?? []).map(fromAnalyzed))
  const [dirty, setDirty] = useState(false) // 사용자가 값을 고쳤는지 — 재분석 시 경고에 쓴다
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [itemErrors, setItemErrors] = useState<ItemErrors[]>([])
  const [formError, setFormError] = useState<string | null>(null)
  const [favoriteIndex, setFavoriteIndex] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [reanalyzing, setReanalyzing] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const confidence = analysis.result?.overallConfidence ?? 0
  const overlay = photoUrl !== null && shouldOverlay(items, confidence)
  const needsReview = confidence < LOW_CONFIDENCE_THRESHOLD
  const errorIndices = items.map((_, i) => i).filter((i) => Object.keys(itemErrors[i] ?? {}).length > 0)
  const correctedCount = items.filter((it) => it.corrected).length

  function updateItems(next: EditableItem[]) {
    setItems(next)
    setItemErrors([])
    setFormError(null)
    setDirty(true)
  }

  function save() {
    const result = validateItems(items)
    setItemErrors(result.itemErrors)
    setFormError(result.formError)
    if (!result.valid) {
      // 오버레이 모드는 필드가 안 보이므로 첫 오류 항목 시트를 열어 오류를 드러낸다
      const firstBad = result.itemErrors.findIndex((e) => Object.keys(e).length > 0)
      if (overlay && firstBad >= 0) setEditingIndex(firstBad)
      return
    }
    onSave(items)
  }

  async function requestReanalysis() {
    if (note.trim() === '') return
    if (dirty && !window.confirm('수정한 값이 사라집니다. 계속할까요?')) return

    const previous = items
    setReanalyzing(true)
    setNotice(null)
    try {
      const started = await reanalyze(analysis.id, note.trim())
      const done = await pollAnalysis(started.id)
      if (done.status === 'COMPLETED' && done.result && done.result.items.length > 0) {
        setItems(done.result.items.map(fromAnalyzed))
        setDirty(false)
        setNote('')
        onAnalysisChange(done)
      } else {
        setItems(previous) // 실패·미검출이면 직전 결과를 되돌린다
        setNotice(done.status === 'NO_FOOD' ? '설명에서 음식을 찾지 못했어요.' : '다시 분석하지 못했어요.')
      }
    } catch (error) {
      setItems(previous)
      setNotice(
        error instanceof ApiError && error.status === 429
          ? '오늘 분석 횟수를 초과했어요.'
          : error instanceof ApiError && error.status === 400
            ? `재분석은 ${MAX_REANALYSIS}회까지 할 수 있어요.`
            : '다시 분석하지 못했어요.',
      )
    }
    setReanalyzing(false)
  }

  async function storeFavorite(values: DraftValues, remember: boolean) {
    try {
      await saveFavorite({ ...values, rememberForAnalysis: remember })
      setNotice(`'${values.name}'을(를) 즐겨찾기에 저장했어요.`)
    } catch {
      setNotice('즐겨찾기 저장에 실패했어요.')
    }
    setFavoriteIndex(null)
  }

  const favoriteItem = favoriteIndex === null ? null : items[favoriteIndex]

  return (
    <Sheet label="분석 결과 확인" onClose={onClose} full>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-lg font-bold text-ink">분석 결과 확인</p>
        <Button type="button" variant="ghost" onClick={onClose}>
          닫기
        </Button>
      </div>

      {notice && (
        <p role="status" className="mb-3 text-sm text-muted">
          {notice}
        </p>
      )}
      {needsReview && (
        <p role="status" className="mb-3 inline-block rounded-full bg-carb-soft px-2 py-0.5 text-xs text-carb">
          확인 필요 — 인식 신뢰도가 낮아요. 값을 확인·수정해주세요.
        </p>
      )}
      {correctedCount > 0 && (
        <p className="mb-3 inline-block rounded-full bg-success-soft px-2 py-0.5 text-xs text-success">
          ✓ 내 보정값이 적용된 항목 {correctedCount}개
        </p>
      )}

      {photoUrl && overlay && (
        <div className="mb-3">
          <PhotoOverlay
            src={photoUrl}
            items={items}
            onSelect={setEditingIndex}
            selectedIndex={editingIndex}
            errorIndices={errorIndices}
          />
        </div>
      )}
      {photoUrl && !overlay && (
        <img src={photoUrl} alt="식사 사진" className="mb-3 block w-full rounded-2xl" />
      )}

      <AnalysisSummary items={items} />

      <div className="mt-3">
        <AnalyzedItemList
          items={items}
          onSelect={setEditingIndex}
          onFavorite={setFavoriteIndex}
          selectedIndex={editingIndex}
          errorIndices={errorIndices}
        />
      </div>

      {formError && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {formError}
        </p>
      )}

      <Button
        type="button"
        variant="secondary"
        onClick={() => {
          const next = [...items, emptyItem()]
          updateItems(next)
          setEditingIndex(next.length - 1)
        }}
        disabled={items.length >= MAX_ITEMS}
        className="mt-3 w-full"
      >
        + 음식 추가
      </Button>

      <div className="mt-4 rounded-2xl bg-canvas p-3">
        <label htmlFor="reanalysis-note" className="text-sm font-semibold text-ink">
          설명을 덧붙여 다시 분석
        </label>
        <p className="mb-2 text-xs text-muted">사진에 안 보이는 조리법·양을 알려주면 더 정확해져요</p>
        <div className="flex gap-2">
          <input
            id="reanalysis-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="예: 드레싱은 절반만 뿌렸어요"
            className="w-full rounded-full border border-border bg-surface px-4 py-2 text-sm text-ink outline-none focus:border-brand"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() => void requestReanalysis()}
            disabled={reanalyzing || note.trim() === ''}
            className="shrink-0"
          >
            {reanalyzing ? '분석 중…' : '재분석'}
          </Button>
        </div>
      </div>

      <Button type="button" onClick={save} disabled={busy || reanalyzing} className="mt-4 w-full py-3">
        {MEAL_TYPE_LABELS[mealType]}에 기록하기
      </Button>

      {editingIndex !== null && items[editingIndex] && (
        <ItemEditSheet
          item={items[editingIndex]}
          errors={itemErrors[editingIndex] ?? {}}
          onChange={(patch) =>
            updateItems(items.map((it, i) => (i === editingIndex ? { ...it, ...patch } : it)))
          }
          onDelete={() => {
            updateItems(items.filter((_, i) => i !== editingIndex))
            setEditingIndex(null)
          }}
          onClose={() => setEditingIndex(null)}
        />
      )}

      {favoriteItem && (
        <FoodDraftSheet
          mode="favorite"
          initial={{
            name: favoriteItem.name,
            quantity: favoriteItem.quantity || '1',
            unit: favoriteItem.unit || '인분',
            kcal: favoriteItem.kcal,
            carbG: favoriteItem.carbG,
            proteinG: favoriteItem.proteinG,
            fatG: favoriteItem.fatG,
          }}
          onSubmit={(values, remember) => void storeFavorite(values, remember)}
          onClose={() => setFavoriteIndex(null)}
        />
      )}
    </Sheet>
  )
}
