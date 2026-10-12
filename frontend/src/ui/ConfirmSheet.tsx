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
 * 기본 선택은 **닫기**다. 넓고, 앞에 온다.
 *
 * 왼쪽 버튼을 "취소"라 부르지 않는다. 하던 작업이 취소된다고 읽힐 수 있어, 앱인토스 UX 가이드가
 * 다이얼로그 왼쪽 버튼을 "닫기"로 통일하라고 한다 (add-apps-in-toss D15).
 *
 * ⚠️ 실행 버튼은 처음에 흰 바탕 + 빨간 글씨였다(강조하지 않으려고). 그런데 **버튼으로 안 읽혀**
 * 무엇을 눌러야 지워지는지 찾게 됐다(2026-08-15). 색을 채우되 자리(오른쪽)와 너비(좁게)로
 * 기본 선택이 닫기임을 계속 말한다. 눈에 띄는 것과 손이 먼저 가는 것은 다르다.
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
    <Sheet label={title} onClose={onCancel} closeButton={false}>
      <p className="text-lg font-bold text-ink">{title}</p>
      <p className="mt-1 text-sm text-muted">{description}</p>

      {detail && (
        <p className="mt-3 rounded-tile bg-track px-3 py-2 text-sm font-medium text-ink">{detail}</p>
      )}

      <ErrorNotice message={error} className="mt-3" />

      <div className="mt-5 flex gap-2">
        {/* 닫기가 넓고 앞에 온다. 기본 선택이 닫기라는 걸 배치로도 말한다 */}
        <Button type="button" variant="secondary" onClick={onCancel} className="flex-1 py-3">
          닫기
        </Button>
        <Button type="button" variant="danger" onClick={onConfirm} disabled={busy} className="py-3">
          {confirmLabel}
        </Button>
      </div>
    </Sheet>
  )
}
