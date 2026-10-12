import { useState } from 'react'
import { setAccessToken } from '../../api/client'
import { withdraw } from '../../api/member'
import { IS_TOSS, loadToss } from '../../platform'
import { ConfirmSheet } from '../../ui/ConfirmSheet'

/**
 * 회원 탈퇴 (add-apps-in-toss D12). 설정 메뉴 맨 아래 작은 글씨로 둔다. 찾을 수는 있어야 하지만 실수로 누를 자리는 아니다.
 *
 * 끝난 뒤 갈 곳이 빌드마다 다르다. 웹은 랜딩으로 새로 읽어 들여 남은 상태를 모두 버린다.
 * 토스는 미니앱을 닫는다. 그대로 두면 다음 요청이 익명 키로 다시 로그인해 빈 새 회원이 바로 생긴다.
 */
export function WithdrawButton() {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirm() {
    setBusy(true)
    setError(null)
    try {
      await withdraw()
    } catch {
      setError('탈퇴하지 못했어요. 잠시 후 다시 시도해주세요.')
      setBusy(false)
      return
    }
    setAccessToken(null)
    if (IS_TOSS) {
      const toss = await loadToss()
      await toss.closeApp()
      return
    }
    window.location.assign('/')
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mx-auto block min-h-11 px-3 text-xs text-muted underline underline-offset-2 touch-manipulation"
      >
        회원 탈퇴
      </button>
      {open && (
        <ConfirmSheet
          title="정말 탈퇴할까요?"
          description="식사, 체중, 사진, 코치 대화까지 모든 기록이 바로 지워지고 되돌릴 수 없어요."
          confirmLabel="탈퇴하기"
          busy={busy}
          error={error}
          onConfirm={() => void confirm()}
          onCancel={() => setOpen(false)}
        />
      )}
    </>
  )
}
