import { useId, useState } from 'react'
import { FEEDBACK_MAX, sendFeedback } from '../../api/feedback'
import { useMutationWithError } from '../../lib/useMutationWithError'
import { ErrorNotice } from '../../ui/ErrorNotice'
import { Button } from '../../ui/form'
import { Sheet } from '../../ui/Sheet'
import { CheckIcon } from '../../ui/icons'

/**
 * 의견 보내기 — 깃허브 이슈로 내보내던 자리를 대신한다.
 *
 * 앱을 벗어나지 않는 것이 핵심이다. 예전에는 브라우저가 새 탭으로 열리고, 로그인을 요구하고,
 * 이슈 양식을 채우게 했다 — **불편을 말하려다 더 불편해졌다.**
 */
export function FeedbackSheet({ appVersion, onClose }: { appVersion: string; onClose: () => void }) {
  const [content, setContent] = useState('')
  const [sent, setSent] = useState(false)
  const inputId = useId()

  const mutation = useMutationWithError(sendFeedback, {
    errorMessage: '의견을 보내지 못했어요. 잠시 후 다시 시도해주세요.',
    onSuccess: () => setSent(true),
  })

  const text = content.trim()
  const tooLong = content.length > FEEDBACK_MAX

  if (sent) {
    return (
      <Sheet label="의견을 보냈어요" onClose={onClose}>
        <div className="py-4 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success-soft text-success">
            <CheckIcon size={24} />
          </span>
          <p className="mt-3 text-lg font-bold text-ink">고맙습니다</p>
          {/* 답장을 약속하지 않는다 — 알림 경로가 없으므로 지킬 수 없는 말이다 */}
          <p className="mt-1 text-sm text-muted">보내주신 의견은 잘 도착했어요.</p>
          <Button type="button" onClick={onClose} className="mt-5 w-full py-3">
            닫기
          </Button>
        </div>
      </Sheet>
    )
  }

  return (
    <Sheet label="의견 보내기" onClose={onClose}>
      <p className="mb-1 text-lg font-bold text-ink">의견 보내기</p>
      <p className="text-sm text-muted">불편한 점이나 있으면 좋겠는 기능을 알려주세요.</p>

      <label htmlFor={inputId} className="sr-only">
        의견 내용
      </label>
      <textarea
        id={inputId}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={5}
        placeholder="예) 사진을 찍었는데 분석이 자꾸 실패해요"
        className="mt-3 w-full resize-none rounded-tile border border-border bg-surface px-3 py-2.5 text-sm text-ink outline-none placeholder:text-muted focus-visible:border-brand-ink focus-visible:ring-2 focus-visible:ring-brand-ink/40"
      />

      <div className="mt-1 flex justify-end text-[11px]">
        <span className={`tabular-nums ${tooLong ? 'font-bold text-danger' : 'text-muted'}`}>
          {content.length} / {FEEDBACK_MAX}
        </span>
      </div>

      <ErrorNotice message={mutation.error} className="mt-2" />

      <Button
        type="button"
        onClick={() => mutation.mutate({ content: text, appVersion })}
        disabled={text.length === 0 || tooLong || mutation.isPending}
        className="mt-4 w-full py-3"
      >
        {mutation.isPending ? '보내는 중…' : '보내기'}
      </Button>
    </Sheet>
  )
}
