import { useEffect, useState } from 'react'

/**
 * 진행 바 — 값이 들어오면 **빈 상태에서 자라난다.**
 *
 * 채움을 트랙 폭 전체로 두고 왼쪽으로 밀어 넣는다(`translateX`). 폭을 줄이는 방식(`width`)이나
 * 가로로 눌러 담는 방식(`scaleX`)이 아닌 이유:
 *
 * - `width`는 레이아웃을 다시 계산한다(DESIGN.md 모션 — transform·opacity만).
 * - `scaleX`는 `rounded-full` 끝을 함께 눌러 30%쯤에서 알약 끝이 뾰족해진다.
 *
 * 미는 방식은 채움이 늘 제 크기라 끝 모양이 그대로고, 왼쪽으로 넘친 부분은 트랙이 잘라낸다.
 */
export function ProgressBar({
  /** 0~100. 범위 밖 값은 잘라 쓴다 */
  value,
  barClass,
  trackClass = 'bg-canvas',
  className = '',
}: {
  value: number
  barClass: string
  trackClass?: string
  className?: string
}) {
  const pct = Math.min(100, Math.max(0, value))

  // 처음 그릴 때는 비어 있어야 자라나는 게 보인다 — 마운트 직후 값으로 옮기며 전환이 돈다
  const [shown, setShown] = useState(0)
  useEffect(() => setShown(pct), [pct])

  return (
    <div className={`h-2.5 w-full overflow-hidden rounded-full ${trackClass} ${className}`}>
      <div
        className={`h-full w-full rounded-full transition-transform duration-700 ease-out ${barClass}`}
        style={{ transform: `translateX(${shown - 100}%)` }}
      />
    </div>
  )
}
