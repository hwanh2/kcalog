import { useId } from 'react'
import type { ReactNode } from 'react'

/**
 * SVG 도판을 **왼쪽에서 오른쪽으로** 드러낸다 — 감싼 것이 선이든 점이든 면이든 한 덩어리로 나온다.
 *
 * 선 길이를 재서 `stroke-dashoffset`을 굴리는 방법은 선 하나만 그려지고, 점·면은 따로 놀며
 * `getTotalLength()` 측정에 기대게 된다. 도판을 가리는 사각형을 가로로 펴면 `transform` 하나로 끝난다.
 *
 * ⚠️ `<svg>` 안에서만 쓴다. 격자·축처럼 **틀에 해당하는 것은 감싸지 않는다** —
 * 함께 쓸리면 그래프가 나중에 튀어나온 것처럼 보인다.
 */
export function SweepReveal({
  width,
  height,
  /** 이 값이 바뀌면 다시 그려진다 — 같은 요소를 두면 클래스가 그대로라 CSS 애니메이션이 다시 돌지 않는다 */
  revealKey,
  children,
}: {
  width: number
  height: number
  revealKey: string
  children: ReactNode
}) {
  // 한 문서에 그래프가 둘 이상 놓이면 고정 id는 서로의 클립을 문다
  const id = useId()

  return (
    <>
      <defs>
        <clipPath id={id}>
          <rect key={revealKey} className="animate-sweep-x" x="0" y="0" width={width} height={height} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>{children}</g>
    </>
  )
}
