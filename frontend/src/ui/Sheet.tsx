import type { ReactNode } from 'react'
import { CloseIcon } from './icons'
import { useDialog } from './useDialog'

/**
 * 바텀시트 껍데기 — 배경 딤 + 하단에서 올라오는 패널. 담기·저장·편집 시트가 공유한다.
 * 스크린리더에는 dialog로 노출하고, 키보드 규약(Esc·포커스 이동·가둠·복귀)은 useDialog가 맡는다.
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
  const panelRef = useDialog(onClose)

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      {/*
        딤은 누르면 닫히지만 탭 정지점이 되어서는 안 된다 — 버튼으로 두면 화면 전체를 덮는
        "닫기" 버튼이 키보드 첫 정지점이 되고 스크린리더도 이를 읽는다(design D4).
        키보드·보조기기 사용자의 닫기 경로는 Esc와 시트 안 닫기 버튼이다.
      */}
      <div aria-hidden="true" className="absolute inset-0 animate-fade-in bg-black/40" onClick={onClose} />
      <div
        ref={panelRef}
        role="dialog"
        aria-label={label}
        aria-modal="true"
        tabIndex={-1}
        /* animate-sheet-in — 시트는 열릴 때 마운트되므로 아래에서 올라오는 연출이 한 번 돈다.
           담기·항목 편집·즐겨찾기·재계산이 모두 이 시트를 지나가, 앱에서 가장 자주 보는 등장이다 */
        className={`animate-sheet-in relative mx-auto w-full max-w-md overscroll-contain rounded-t-card bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-lg outline-none ${
          full ? 'max-h-[92dvh] overflow-y-auto' : 'max-h-[80dvh] overflow-y-auto'
        }`}
      >
        {/*
          딤이 탭 대상에서 빠졌으므로 닫기 수단은 시트가 직접 보장한다.
          호출측에 맡기면 빠뜨린 시트가 생기고, 그러면 키보드로 닫을 길이 Esc뿐이 된다.
          44px 히트 영역 — 아이콘은 작게 두고 패딩으로 넓힌다.
        */}
        <button
          type="button"
          aria-label="닫기"
          onClick={onClose}
          className="absolute right-2 top-2 z-10 flex h-11 w-11 items-center justify-center rounded-full text-muted touch-manipulation focus-visible:ring-2 focus-visible:ring-brand-ink"
        >
          <CloseIcon />
        </button>
        {children}
      </div>
    </div>
  )
}
