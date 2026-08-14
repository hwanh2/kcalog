import { ErrorNotice } from './ErrorNotice'
import { Button } from './form'
import { Sheet } from './Sheet'

/**
 * 되돌릴 수 없는 동작을 실행하기 전 확인을 받는다.
 *
 * 브라우저 기본 `confirm` 대신 `Sheet`를 쓰는 이유(design D1) — PWA로 설치하면
 * `confirm`은 출처 문구("localhost 내용:")를 그대로 노출하고 앱 디자인과 어긋난다.
 * `Sheet`를 쓰면 Esc·포커스 가둠·포커스 복귀·안전 영역이 그대로 따라온다.
 *
 * 기본 선택은 **취소**다. 파괴적 버튼을 강조하지 않고 오른쪽에 두어,
 * 습관적으로 한 번 더 누르는 손가락에 데이터가 지워지지 않게 한다.
 */
export function ConfirmSheet({
  title,
  description,
  detail,
  confirmLabel,
  busy = false,
  error = null,
  onConfirm,
  onCancel,
}: {
  title: string
  /** 왜 신중해야 하는지 — 예: "되돌릴 수 없어요" */
  description: string
  /** 무엇이 사라지는지 — 예: "현미밥 외 2개 · 642 kcal" */
  detail?: string
  confirmLabel: string
  busy?: boolean
  /** 실행이 실패했을 때 — 시트를 열어둔 채 여기 보여준다(닫으면 재시도할 곳이 없다) */
  error?: string | null
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <Sheet label={title} onClose={onCancel}>
      <p className="pr-12 text-lg font-bold text-ink">{title}</p>
      <p className="mt-1 text-sm text-muted">{description}</p>

      {detail && (
        <p className="mt-3 rounded-tile bg-track px-3 py-2 text-sm font-medium text-ink">{detail}</p>
      )}

      <ErrorNotice message={error} className="mt-3" />

      <div className="mt-5 flex gap-2">
        {/* 취소가 넓고 앞에 온다 — 기본 선택이 취소라는 걸 배치로도 말한다 */}
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1 py-3">
          취소
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onConfirm}
          disabled={busy}
          className="py-3 text-danger"
        >
          {confirmLabel}
        </Button>
      </div>
    </Sheet>
  )
}
