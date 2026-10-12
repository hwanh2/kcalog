import { useEffect, useRef, useState } from 'react'
import { IS_TOSS, loadToss } from '../../platform'
import { AlbumIcon, CameraIcon, CloseIcon } from '../../ui/icons'
import { TUTORIAL_IDS } from '../tutorial/steps'
import { PHOTO_PREVIEW_CLASS } from './photoPreview'

type Source = 'camera' | 'album'

const PERMISSION_LABEL: Record<Source, string> = { camera: '카메라', album: '사진' }

/**
 * 사진 입력 카드. 촬영과 앨범을 버튼 둘로 나눠 웹과 토스 빌드가 같은 모양을 쓴다 (add-apps-in-toss D8).
 * - 웹: 숨긴 파일 입력을 연다. 촬영 쪽만 capture를 걸어 카메라가 바로 열린다
 * - 토스: `<input type="file">`이 토스 WebView에서 동작하는지 문서에 없어서 SDK 카메라, 앨범 API를 쓴다
 */
export function PhotoPicker({
  photoUrl,
  autoCamera,
  onPick,
  onClear,
}: {
  photoUrl: string | null
  autoCamera?: boolean
  onPick: (file: File) => void
  onClear: () => void
}) {
  const [denied, setDenied] = useState<Source | null>(null)
  const [failed, setFailed] = useState(false)
  const openedRef = useRef(false)
  const albumInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  async function pick(source: Source) {
    if (!IS_TOSS) {
      ;(source === 'camera' ? cameraInputRef : albumInputRef).current?.click()
      return
    }
    setDenied(null)
    setFailed(false)
    try {
      const toss = await loadToss()
      const result = await toss.pickPhoto(source)
      if (result.status === 'picked') onPick(new File([result.image], 'meal.jpg', { type: 'image/jpeg' }))
      else if (result.status === 'denied') setDenied(source)
    } catch {
      setFailed(true)
    }
  }

  async function requestPermission(source: Source) {
    const toss = await loadToss()
    if (await toss.requestPhotoPermission(source)) await pick(source)
  }

  // 홈의 촬영 카드로 들어왔으면 한 번만 카메라를 연다 (design D13)
  const pickRef = useRef(pick)
  pickRef.current = pick
  useEffect(() => {
    if (autoCamera && !openedRef.current) {
      openedRef.current = true
      void pickRef.current('camera')
    }
  }, [autoCamera])

  return (
    <div id={TUTORIAL_IDS.photo} className="relative rounded-2xl bg-track px-4 py-8 text-center">
      {photoUrl ? (
        <>
          <img src={photoUrl} alt="선택한 사진" className={`mx-auto ${PHOTO_PREVIEW_CLASS}`} />
          <button
            type="button"
            aria-label="사진 지우기"
            onClick={onClear}
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-ink/60 text-on-brand"
          >
            <CloseIcon />
          </button>
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
        </>
      )}

      <div className="mt-4 flex justify-center gap-2">
        <button
          type="button"
          onClick={() => void pick('camera')}
          className="press inline-flex min-h-11 items-center gap-1.5 rounded-full bg-brand px-5 text-sm font-bold text-on-brand touch-manipulation focus-visible:ring-2 focus-visible:ring-brand-ink focus-visible:ring-offset-2"
        >
          <CameraIcon />
          {photoUrl ? '다시 촬영' : '촬영'}
        </button>
        <button
          type="button"
          onClick={() => void pick('album')}
          className="press inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-surface px-5 text-sm font-bold text-ink touch-manipulation focus-visible:ring-2 focus-visible:ring-brand-ink focus-visible:ring-offset-2"
        >
          <AlbumIcon />
          앨범
        </button>
      </div>

      {!IS_TOSS && (
        <>
          <input
            ref={albumInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const next = e.target.files?.[0]
              if (next) onPick(next)
              // 같은 사진을 다시 골라도 change가 오게 비운다
              e.target.value = ''
            }}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const next = e.target.files?.[0]
              if (next) onPick(next)
              e.target.value = ''
            }}
          />
        </>
      )}

      {/* 권한을 거부해도 아래 설명 입력과 직접 입력은 그대로 쓸 수 있다(출시 체크리스트) */}
      {denied && (
        <p role="alert" className="mt-3 text-sm font-medium text-danger">
          {PERMISSION_LABEL[denied]} 권한이 필요해요.{' '}
          <button
            type="button"
            onClick={() => void requestPermission(denied)}
            className="min-h-11 font-bold underline underline-offset-2 touch-manipulation"
          >
            권한 허용하기
          </button>
        </p>
      )}
      {failed && (
        <p role="alert" className="mt-3 text-sm font-medium text-danger">
          사진을 불러오지 못했어요. 설명으로 기록하거나 직접 입력해주세요.
        </p>
      )}
    </div>
  )
}
