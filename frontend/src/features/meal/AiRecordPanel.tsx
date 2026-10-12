import { useEffect, useState } from 'react'
import { createAnalysis } from '../../api/analysis'
import type { Analysis } from '../../api/analysis'
import { ApiError } from '../../api/client'
import type { MealType } from '../../api/meal'
import { TUTORIAL_IDS } from '../tutorial/steps'
import { AiNotice } from '../../ui/AiNotice'
import { Button } from '../../ui/form'
import { NoteIcon } from '../../ui/icons'
import { AnalysisResultSheet } from './AnalysisResultSheet'
import { AnalyzingView } from './AnalyzingView'
import { resizeImage } from './imageResize'
import { pollAnalysis } from './pollAnalysis'
import { PhotoPicker } from './PhotoPicker'
import type { EditableItem } from './mealItems'

type Step = 'input' | 'analyzing'

/**
 * AI로 기록 — 사진만 / 사진+설명 / 설명만 세 경우를 한 화면에서 받는다(design D9·17).
 * 분석이 끝나면 결과 확인 시트가 열리고, 실패하면 직접 입력으로 유도한다.
 * autoCamera면 진입과 동시에 촬영을 연다(FAB에서 넘어온 경우 — design D13).
 */
export function AiRecordPanel({
  mealType,
  autoCamera,
  saving,
  onMealTypeChange,
  onSave,
  onManual,
}: {
  mealType: MealType
  autoCamera?: boolean
  saving?: boolean
  onMealTypeChange: (next: MealType) => void
  onSave: (items: EditableItem[], analysisJobId: number) => void
  onManual: () => void
}) {
  const [step, setStep] = useState<Step>('input')
  const [file, setFile] = useState<File | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // 미리보기 blob URL은 메모리에만 두고(사진 미저장), 교체·언마운트 시 해제한다
  useEffect(() => {
    if (!photoUrl) return
    return () => URL.revokeObjectURL(photoUrl)
  }, [photoUrl])

  function pickFile(next: File) {
    setFile(next)
    setPhotoUrl(URL.createObjectURL(next))
    setNotice(null)
  }

  async function analyze() {
    if (!file && note.trim() === '') return
    setStep('analyzing')
    setNotice(null)
    try {
      const image = file ? await resizeImage(file) : undefined
      const created = await createAnalysis({ image, note: note.trim() || undefined })
      const done = await pollAnalysis(created.id)
      if (done.status === 'COMPLETED' && done.result && done.result.items.length > 0) {
        setAnalysis(done)
      } else if (done.status === 'NO_FOOD') {
        setNotice(done.result?.notes || '음식을 찾지 못했어요. 직접 입력해주세요.')
      } else {
        setNotice('분석에 실패했어요. 직접 입력해주세요.')
      }
    } catch (error) {
      // 업로드 실패·제한(429)·타임아웃 → 직접 입력 폴백
      setNotice(
        error instanceof ApiError && error.status === 429
          ? '오늘 분석 횟수를 초과했어요. 직접 입력해주세요.'
          : '분석에 실패했어요. 직접 입력해주세요.',
      )
    }
    setStep('input')
  }

  function reset() {
    setAnalysis(null)
    setFile(null)
    setPhotoUrl(null)
    setNote('')
  }

  if (step === 'analyzing') {
    return <AnalyzingView photoUrl={photoUrl} />
  }

  return (
    <>
      <PhotoPicker
        photoUrl={photoUrl}
        autoCamera={autoCamera}
        onPick={pickFile}
        onClear={() => {
          setFile(null)
          setPhotoUrl(null)
        }}
      />

      {/* 라벨과 입력을 함께 감싼다. 앱 둘러보기가 둘을 한 덩어리로 비춘다 */}
      <div id={TUTORIAL_IDS.note} className="mt-4">
        <label htmlFor="ai-note" className="flex items-center gap-1.5 text-sm font-semibold text-ink">
          <span className="text-brand-ink">
            <NoteIcon />
          </span>
          무엇을 드셨나요? <span className="font-normal text-muted">(사진 없이 설명만으로도 돼요)</span>
        </label>
        <textarea
          id="ai-note"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="예: 김밥 한 줄이랑 라면 반 개"
          className="mt-1 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-ink outline-none focus-visible:border-brand-ink focus-visible:ring-2 focus-visible:ring-brand-ink/40"
        />
      </div>

      {/* 이 안내는 전부 실패 경로(분석 실패·429·음식 미검출)다 — 놓치면 안 되므로 alert로 알린다 */}
      {notice && (
        <p role="alert" className="mt-2 text-sm font-medium text-danger">
          {notice}
        </p>
      )}

      <AiNotice className="mt-3">
        AI가 사진과 설명을 보고 음식과 영양 정보를 추정해요. 실제와 다를 수 있으니 확인한 뒤 저장해주세요.
      </AiNotice>

      <Button
        type="button"
        onClick={() => void analyze()}
        disabled={!file && note.trim() === ''}
        className="mt-3 w-full py-3"
      >
        분석하기
      </Button>

      <Button type="button" variant="ghost" onClick={onManual} className="mt-2 w-full">
        AI 없이 직접 입력하기 ›
      </Button>

      {analysis && (
        <AnalysisResultSheet
          analysis={analysis}
          photoUrl={photoUrl}
          mealType={mealType}
          busy={saving}
          onAnalysisChange={setAnalysis}
          onMealTypeChange={onMealTypeChange}
          onSave={(items) => {
            onSave(items, analysis.id)
            reset()
          }}
          onClose={reset}
        />
      )}
    </>
  )
}
