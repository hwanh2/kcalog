import { useState } from 'react'
import { MAX_REANALYSIS, reanalyze } from '../../api/analysis'
import type { Analysis } from '../../api/analysis'
import { ApiError } from '../../api/client'
import { saveFavorite } from '../../api/food'
import type { MealType } from '../../api/meal'
import { Button } from '../../ui/form'
import { ErrorNotice } from '../../ui/ErrorNotice'
import { Sheet } from '../../ui/Sheet'
import { FavoriteMealSaveSheet } from '../food/FavoriteMealSaveSheet'
import { FoodDraftSheet } from '../food/FoodDraftSheet'
import type { DraftValues } from '../food/FoodDraftSheet'
import { AnalysisSummary, AnalyzedItemList } from './AnalysisSummary'
import { ItemEditSheet } from './ItemEditSheet'
import { PhotoOverlay } from './PhotoOverlay'
import { MEAL_TYPE_LABELS, MEAL_TYPE_ORDER } from './mealDefaults'
import { pollAnalysis } from './pollAnalysis'
import {
  LOW_CONFIDENCE_THRESHOLD,
  MAX_ITEMS,
  emptyItem,
  fromAnalyzed,
  shouldOverlay,
  toFavoriteMealItems,
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
  onMealTypeChange,
  onSave,
  onClose,
}: {
  analysis: Analysis
  photoUrl: string | null
  mealType: MealType
  busy?: boolean
  onAnalysisChange: (next: Analysis) => void
  /** 끼니를 이 화면에서 바꾼다 — 상태는 부모(음식기록 탭)가 들고 있어 세그먼트와 같은 값을 가리킨다 */
  onMealTypeChange: (next: MealType) => void
  onSave: (items: EditableItem[]) => void
  onClose: () => void
}) {
  const [items, setItems] = useState<EditableItem[]>(() => (analysis.result?.items ?? []).map(fromAnalyzed))
  const [dirty, setDirty] = useState(false) // 사용자가 값을 고쳤는지 — 재분석 시 경고에 쓴다
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [itemErrors, setItemErrors] = useState<ItemErrors[]>([])
  const [formError, setFormError] = useState<string | null>(null)
  const [favoriteIndex, setFavoriteIndex] = useState<number | null>(null)
  const [savingSet, setSavingSet] = useState(false)
  const [note, setNote] = useState('')
  const [reanalyzing, setReanalyzing] = useState(false)
  /**
   * 실패 안내 전용. 성공은 알리지 않는다 — 즐겨찾기는 ★로, 재분석은 목록이 바뀌는 것으로
   * 결과가 이미 드러난다(design D4). 문구를 띄우면 자동으로 사라지지 않아 다음 동작의
   * 결과처럼 읽힌다.
   */
  const [error, setError] = useState<string | null>(null)

  const confidence = analysis.result?.overallConfidence ?? 0
  // 오버레이 여부는 분석 결과를 받은 시점에 한 번 정하고 고정한다 —
  // 매 렌더 재계산하면 "+ 음식 추가"로 box 없는 항목이 들어오는 순간 사진이 배지에서 민무늬로 뒤집힌다
  const [overlay, setOverlay] = useState(
    () => photoUrl !== null && shouldOverlay((analysis.result?.items ?? []).map(fromAnalyzed), confidence),
  )
  const needsReview = confidence < LOW_CONFIDENCE_THRESHOLD
  const errorIndices = items.map((_, i) => i).filter((i) => Object.keys(itemErrors[i] ?? {}).length > 0)
  const correctedCount = items.filter((it) => it.corrected).length

  function updateItems(next: EditableItem[]) {
    setItems(next)
    setItemErrors([])
    setFormError(null)
    setDirty(true)
  }

  /**
   * 검증하고, 실패하면 오류를 드러낸 뒤 false를 준다.
   *
   * 기록 저장과 세트 저장이 **같은 검증**을 통과해야 한다 — 세트가 잘못된 값을 품으면 나중에
   * 담을 때 그때야 막혀 손쓸 수 없다. 두 곳에 같은 전처리를 늘어놓으면 "첫 오류 항목을 연다"
   * 같은 규칙이 바뀔 때 한쪽만 고쳐진다.
   */
  function validateAndReveal(): boolean {
    const result = validateItems(items)
    setItemErrors(result.itemErrors)
    setFormError(result.formError)
    if (result.valid) return true
    // 오버레이 모드는 필드가 안 보이므로 첫 오류 항목 시트를 열어 오류를 드러낸다
    const firstBad = result.itemErrors.findIndex((e) => Object.keys(e).length > 0)
    if (overlay && firstBad >= 0) setEditingIndex(firstBad)
    return false
  }

  function openSetSave() {
    if (validateAndReveal()) setSavingSet(true)
  }

  function save() {
    if (validateAndReveal()) onSave(items)
  }

  async function requestReanalysis() {
    if (note.trim() === '') return
    if (dirty && !window.confirm('수정한 값이 사라집니다. 계속할까요?')) return

    const previous = items
    setReanalyzing(true)
    setError(null)
    try {
      const started = await reanalyze(analysis.id, note.trim())
      const done = await pollAnalysis(started.id)
      if (done.status === 'COMPLETED' && done.result && done.result.items.length > 0) {
        const next = done.result.items.map(fromAnalyzed)
        setItems(next)
        // 결과가 통째로 바뀌었으니 오버레이 여부도 이 시점 기준으로 다시 확정한다
        setOverlay(photoUrl !== null && shouldOverlay(next, done.result.overallConfidence))
        setDirty(false)
        setNote('')
        onAnalysisChange(done)
      } else {
        setItems(previous) // 실패·미검출이면 직전 결과를 되돌린다
        setError(done.status === 'NO_FOOD' ? '설명에서 음식을 찾지 못했어요.' : '다시 분석하지 못했어요.')
      }
    } catch (e) {
      setItems(previous)
      setError(
        e instanceof ApiError && e.status === 429
          ? '오늘 분석 횟수를 초과했어요.'
          : e instanceof ApiError && e.status === 400
            ? `재분석은 ${MAX_REANALYSIS}회까지 할 수 있어요.`
            : '다시 분석하지 못했어요.',
      )
    }
    setReanalyzing(false)
  }

  async function storeFavorite(values: DraftValues, remember: boolean) {
    try {
      await saveFavorite({ ...values, rememberForAnalysis: remember })
      // 성공 안내 없음 — 항목의 ★이 채워지는 것으로 결과가 드러난다(AddFoodPanel과 동일)
    } catch {
      setError('즐겨찾기에 저장하지 못했어요. 잠시 후 다시 시도해주세요.')
    }
    setFavoriteIndex(null)
  }

  const favoriteItem = favoriteIndex === null ? null : items[favoriteIndex]

  return (
    <Sheet label="분석 결과 확인" onClose={onClose} full>
      {/* 닫기는 Sheet가 오른쪽 위에 제공한다 — 여기서 또 두면 같은 동작이 두 개가 된다 */}
      <p className="mb-3 pr-12 text-lg font-bold text-ink">분석 결과 확인</p>

      <ErrorNotice message={error} className="mb-3" />
      {needsReview && (
        <p role="status" className="mb-3 inline-block rounded-full bg-carb-soft px-2 py-0.5 text-xs text-carb-ink">
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
        // 배지 오버레이를 쓰지 않을 때의 사진 — 오버레이 쪽과 같은 비율로 자리를 잡아
        // 두 경로 사이에서 아래 내용의 위치가 달라지지 않게 한다
        <img
          src={photoUrl}
          alt="식사 사진"
          className="mb-3 block aspect-[4/3] w-full rounded-2xl object-cover"
        />
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

      <div className="mt-3 flex gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            const next = [...items, emptyItem()]
            updateItems(next)
            setEditingIndex(next.length - 1)
          }}
          disabled={items.length >= MAX_ITEMS}
          className="flex-1"
        >
          + 음식 추가
        </Button>
        {/* 항목마다 ★을 누르는 대신 이 구성 전체를 한 덩어리로 저장한다(design D7) */}
        <Button type="button" variant="secondary" onClick={openSetSave} className="flex-1">
          ☆ 세트로 저장
        </Button>
      </div>

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
            className="w-full rounded-full border border-border bg-surface px-4 py-2 text-sm text-ink outline-none focus-visible:border-brand-ink focus-visible:ring-2 focus-visible:ring-brand-ink/40"
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

      {/* "점심 ▾ 에 [기록하기]" — 끼니가 버튼 문구의 일부로 읽히되 그 자리에서 바꿀 수 있다(design D2).
          버튼 안에 버튼은 넣을 수 없어 형제로 두고, 네이티브 select라 모바일에서 OS 피커가 열린다 */}
      <div className="mt-4 flex items-center gap-2">
        <div className="relative shrink-0">
          <label htmlFor="record-meal-type" className="sr-only">
            기록할 끼니
          </label>
          <select
            id="record-meal-type"
            value={mealType}
            onChange={(e) => onMealTypeChange(e.target.value as MealType)}
            className="min-h-11 appearance-none rounded-tile bg-brand-soft py-2 pl-3.5 pr-9 text-[15px] font-bold text-brand-ink outline-none touch-manipulation focus-visible:ring-2 focus-visible:ring-brand-ink"
          >
            {MEAL_TYPE_ORDER.map((type) => (
              <option key={type} value={type}>
                {MEAL_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
          {/* select의 기본 화살표는 브라우저마다 달라 감추고 직접 그린다 — 클릭은 select로 통과시킨다 */}
          <span
            aria-hidden
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-brand-ink"
          >
            ▼
          </span>
        </div>
        <span className="shrink-0 text-[15px] text-ink">에</span>
        <Button
          type="button"
          onClick={save}
          disabled={busy || reanalyzing}
          className="min-w-0 flex-1 py-3"
        >
          기록하기
        </Button>
      </div>

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

      {savingSet && (
        <FavoriteMealSaveSheet
          items={toFavoriteMealItems(items)}
          onSaved={() => setSavingSet(false)}
          onClose={() => setSavingSet(false)}
        />
      )}
    </Sheet>
  )
}
