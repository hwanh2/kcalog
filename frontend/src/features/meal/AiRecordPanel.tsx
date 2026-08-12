import { useEffect, useRef, useState } from 'react'
import { createAnalysis } from '../../api/analysis'
import type { Analysis } from '../../api/analysis'
import { ApiError } from '../../api/client'
import type { MealType } from '../../api/meal'
import { Button } from '../../ui/form'
import { CameraIcon, CloseIcon, NoteIcon } from '../../ui/icons'
import { AnalysisResultSheet } from './AnalysisResultSheet'
import { AnalyzingView } from './AnalyzingView'
import { resizeImage } from './imageResize'
import { pollAnalysis } from './pollAnalysis'
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
  onSave,
  onManual,
}: {
  mealType: MealType
  autoCamera?: boolean
  saving?: boolean
  onSave: (items: EditableItem[], analysisJobId: number) => void
  onManual: () => void
}) {
  const [step, setStep] = useState<Step>('input')
  const [file, setFile] = useState<File | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const openedRef = useRef(false)

  // 미리보기 blob URL은 메모리에만 두고(사진 미저장), 교체·언마운트 시 해제한다
  useEffect(() => {
    if (!photoUrl) return
    return () => URL.revokeObjectURL(photoUrl)
  }, [photoUrl])

  // FAB으로 들어왔으면 한 번만 촬영을 연다
  useEffect(() => {
    if (autoCamera && !openedRef.current) {
      openedRef.current = true
      fileInputRef.current?.click()
    }
  }, [autoCamera])

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
      {/* 사진은 선택 입력이지만 이 앱의 주된 길이라 넓게 편다 */}
      <label className="relative block cursor-pointer rounded-2xl bg-track px-4 py-8 text-center">
        {photoUrl ? (
          <>
            <img src={photoUrl} alt="선택한 사진" className="mx-auto max-h-56 rounded-2xl" />
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-bold text-on-brand">
              <CameraIcon />
              사진 변경
            </span>
          </>
        ) : (
          <>
            <span
              aria-hidden
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-border text-muted"
            >
              <CameraIcon size={26} />
            </span>
            <span className="mt-3 block font-bold text-ink">사진으로 기록하기</span>
            <span className="mt-0.5 block text-sm text-muted">AI가 음식을 자동으로 인식해요</span>
            <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand px-5 py-2.5 text-sm font-bold text-on-brand">
              <CameraIcon />
              촬영하기
            </span>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const next = e.target.files?.[0]
            if (next) pickFile(next)
          }}
        />

        {/* 사진 위 오른쪽 위 X — label 안이지만 파일 선택이 열리지 않게 이벤트를 막는다 */}
        {photoUrl && (
          <button
            type="button"
            aria-label="사진 지우기"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setFile(null)
              setPhotoUrl(null)
            }}
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-ink/60 text-on-brand"
          >
            <CloseIcon />
          </button>
        )}
      </label>

      <label htmlFor="ai-note" className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-ink">
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

      {/* 이 안내는 전부 실패 경로(분석 실패·429·음식 미검출)다 — 놓치면 안 되므로 alert로 알린다 */}
      {notice && (
        <p role="alert" className="mt-2 text-sm font-medium text-danger">
          {notice}
        </p>
      )}

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
