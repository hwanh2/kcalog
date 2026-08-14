import type { ReactNode } from 'react'

/**
 * 실패 안내 — `useSafeMutation`의 `error`를 화면에 붙일 때 쓴다.
 * 모양과 role을 한 곳에 둬서, 화면마다 오류가 다르게 생기거나
 * `role="status"`로 잘못 알려지는 일이 없게 한다.
 */
export function ErrorNotice({
  message,
  action,
  className = '',
}: {
  message: string | null
  /** "다시 시도" 같은 복구 수단 */
  action?: ReactNode
  className?: string
}) {
  if (!message) return null
  return (
    <p
      role="alert"
      className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-danger ${className}`}
    >
      {message}
      {action}
    </p>
  )
}
