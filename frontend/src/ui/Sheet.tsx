import type { ReactNode } from 'react'

/**
 * 바텀시트 껍데기 — 배경 딤 + 하단에서 올라오는 패널. 담기·저장·편집 시트가 공유한다.
 * 배경을 누르면 닫히고, 스크린리더에는 dialog로 노출한다.
 * full=true면 화면 대부분을 덮는다(분석 결과처럼 정보량이 많은 경우).
 */
export function Sheet({
  label,
  onClose,
  full = false,
  children,
}: {
  label: string
  onClose: () => void
  full?: boolean
  children: ReactNode
}) {
  return (
    <div role="dialog" aria-label={label} aria-modal="true" className="fixed inset-0 z-50 flex items-end">
      <button type="button" aria-label="닫기" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className={`relative mx-auto w-full max-w-md overflow-y-auto rounded-t-card bg-surface p-4 shadow-lg ${
          full ? 'max-h-[92dvh]' : 'max-h-[80dvh]'
        }`}
      >
        {children}
      </div>
    </div>
  )
}
